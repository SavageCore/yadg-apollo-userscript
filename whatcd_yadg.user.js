// ==UserScript==
// @id             what-yadg
// @name           what.cd - YADG
// @description    This script provides integration with online description generator YADG (http://yadg.dyndns.org)
// @version        0.1.1
// @namespace      yadg
// @include        http*://*what.cd/upload.php*
// @require        https://ajax.googleapis.com/ajax/libs/jquery/1.6.3/jquery.js
// ==/UserScript==

var yadg_url = "http://yadg.cc";
var album_desc = $("textarea#album_desc"),
	tr_albumtitle = $("tr#title_tr"),
	tr_artists = $("tr#artist_tr"),
	input = $('<input type="text" name="input" id="yadg_input" size="60" />'),
	select = $('<select name="scraper" id="yadg_scraper"><option value="beatport">Beatport</option><option value="discogs" selected="selected">Discogs</option><option value="metalarchives">Metal-Archives</option><option value="musicbrainz">Musicbrainz</option></select>'),
	button = $('<input type="submit" value="Fetch" id="yadg_submit"/>'),
	tr = $('<tr id="yadg_tr"></tr>'),
	td_label = $('<td class="label">YADG:</td>'),
	td_content = $('<td></td>'),
	div_response = $('<div id="yadg_response"></div>');

var input_string = "Enter url or search term";

td_content.append(input);
td_content.append(select);
td_content.append(button);
td_content.append(div_response);
tr.append(td_label);
tr.append(td_content);
tr_albumtitle.after(tr);

select.css('margin-right','10px')

input.css('margin-right','5px');
input.attr('value',input_string);

input.bind('focusin', function(e) {
	if ( input.attr('value') == input_string ) {
		input.attr('value','');
	}
});

input.bind('focusout', function(e) {
	if ( input.attr('value') == '' ) {
		input.attr('value',input_string);
	}
});

function busyStart() {
	input.attr('disabled',true);
	select.attr('disabled',true);
	button.attr('disabled',true);
	button.attr('value','Please wait...');
};

function busyStop() {
	button.attr('value','Fetch');
	input.attr('disabled',false);
	select.attr('disabled',false);
	button.attr('disabled',false);
};
	
var lastStateError = false;

function fillFormValuesFromResponse(response) {
	if (response.status != 200) {
		$(window).scrollTop(tr_artists.position().top);
		busyStop();
		return null
	};
	var data = jQuery.parseJSON(response.responseText)[1],
		artist_inputs = $("input#artist"),
		album_title_input = $("input#title"),
		year_input = $("input#year"),
		label_input = $("input#record_label"),
		catalog_input = $("input#catalogue_number"),
		tags_input = $("input#tags");
	
	var artists = false,
		track_artists = {},
		year = false,
		title = false,
		label = false,
		catalog = false,
		genre = false,
		style = false,
		tags = false;
	
	if (data.hasOwnProperty('artists')) {
		artists = data.artists;
		
		//remove 'Various' from artists
		var idx = artists.indexOf('Various');
		if(idx!=-1) artists.splice(idx, 1);
	};
	if (data.hasOwnProperty('discs')) {
		for (var key in data.discs) {
			for (var i in data.discs[key]) {
				var track = data.discs[key][i];
				for (var j in track[1]) {
					if ( track[1][j] != null && !(track[1][j] in track_artists) ) {
						track_artists[track[1][j]] = '';
					};
				};
			};
		};
		var artists_dict = {};
		if (artists == false) {
			artists = [];
		}  else {
			for (var index in artists) {
				artists_dict[artists[index]] = '';
			};
		};
		for (var artist in track_artists) {
			if (!(artist in artists_dict)) {
				artists.push(artist);
				artists_dict[artist] = '';
			};
		};
	};
	if (data.hasOwnProperty('released')) {
		year = data.released.match(/\d{4}/)[0];
		if (year.length != 4) {
			year = false;
		};
	};
	if (data.hasOwnProperty('title')) {
		title = data.title;
	};
	if (data.hasOwnProperty('label')) {
		label = data.label[0];
	};
	if (data.hasOwnProperty('catalog')) {
		catalog = data.catalog[0];
	};
	if (data.hasOwnProperty('genre')) {
		genre = data.genre;
	};
	if (data.hasOwnProperty('style')) {
		style = data.style;
	};
	if (genre != false && style != false) {
		tags = data.genre.concat(data.style);
	} else if (genre != false) {
		tags = data.genre;
	} else if (style != false) {
		tags = data.style;
	}
	
	if (tags != false) {
		var tag_string = "";
		
		for (var i = 0; i < tags.length; i++) {
			tag_string = tag_string + tags[i].replace(/\s+/g,'.');
			if (i != tags.length-1) {
				tag_string = tag_string + ', ';
			};
		};
	};
	
	if (artists != false) {
		var diff = artist_inputs.length - artists.length;
		if (diff != 0) {
			if (diff > 0) {
				for (var i = 0; i < diff; i++) {
					unsafeWindow.RemoveArtistField();
				};
			} else {
				for (var i = 0; i < -diff; i++) {
					unsafeWindow.AddArtistField();
				};
			};
		};
		
		artist_inputs = $("input#artist");
		
		artist_inputs.each(function(index) {
			$(this).attr('value',artists[index]);
		});
	} else {
		artist_inputs.each(function(index) {
			$(this).attr('value','');
		});
	};
	
	
	if (year != false) {
		year_input.attr('value',year);
	} else {
		year_input.attr('value','');
	};
	if (title != false) {
		album_title_input.attr('value',title);
	} else {
		album_title_input.attr('value','');
	};
	if (label != false) {
		label_input.attr('value',label);
	} else {
		label_input.attr('value','');
	};
	if (catalog != false) {
		catalog_input.attr('value',catalog);
	} else {
		catalog_input.attr('value','');
	};
	if (tags != false) {
		tags_input.attr('value',tag_string.toLowerCase());
	} else {
		tags_input.attr('value','');
	};
	
	$(window).scrollTop(tr_artists.position().top);
	busyStop();
};

function makeRequestById(e) {
	e.preventDefault();
	busyStart();
	GM_xmlhttpRequest({
		method: "GET",
		url: $(this).attr('href') + "?xhr",
		onload: function(response) {
			if (response.status == 200) {
				getResult(response.responseText);
			} else {
				div_response.text('Sorry, an error occured. Please try again.');
				lastStateError = true;
				busyStop();
			};
		},
		onerror: function(response) {
			div_response.text('Sorry, an error occured. Please try again.');
			lastStateError = true;
			busyStop();
		}
	});
};

function getResult(id) {
	GM_xmlhttpRequest({
		method: "GET",
		url: yadg_url + "/result/" + id + "?xhr",
		onload: function(response) {
			var data = jQuery.parseJSON(response.responseText);
			
			if (data[0] == 'result') {
				album_desc.text(data[1]);
				
				if (lastStateError == true) {
					div_response.empty();
				};
				lastStateError == false;
				
				GM_xmlhttpRequest({
					method: "GET",
					url: response.finalUrl + "&f=raw",
					onload: fillFormValuesFromResponse,
					onerror: function(response) {
						$(window).scrollTop(tr_artists.position().top);
						busyStop();
					}
				});
			} else if (data[0] == 'list') {
				var ul = $('<ul id="yadg_release_list"></ul>');
				
				var scraper_results = data[1];
				for (scraper in scraper_results) {
					var release_list = scraper_results[scraper];
					for (var i = 0; i < release_list.length;i++) {
						var name = release_list[i]['name'],
							info = release_list[i]['info'],
							id = release_list[i]['release'];
						
						var li = $('<li></li>');
						var a = $('<a href="' + yadg_url + '/get/' + scraper + '/' + id + '">'+name+'</a>');
						a.bind('click', makeRequestById);
						
						li.css('margin-bottom','5px');
						li.append(a);
						li.append('<br />')
						li.append(info);
						
						ul.append(li);
					};
				};
				
				if (ul.children().length != 0) {
					div_response.empty();
					div_response.append(ul);
					lastStateError == false;
				} else {
					div_response.text('Sorry, there were no matches.');
					lastStateError = true;
				}
				busyStop();
			} else if (data[0] == 'notfound') {
				div_response.text('I could not find the release with the given ID. You may want to try again with another one.');
				lastStateError = true;
				busyStop();
			} else if (data[0] == 'waiting') {
				var id = response.finalUrl.replace(/.*?\/result\/(.*?)\?xhr/,'$1');
				var delay = function() { getResult(id); };
				window.setTimeout(delay, 1000);
			} else {
				div_response.text('Something weird happened. Please try again');
				lastStateError = true;
				busyStop();
			}
		},
		onerror: function(response) {
			div_response.text('Sorry, an error occured. Please try again.');
			lastStateError = true;
			busyStop();
		}
	});
};

function autoFillInput() {
	var albumtitle_input = $('input',tr_albumtitle),
		artist_inputs = $('td#artistfields input'),
		new_val = "";
	
	artist_inputs.each(function() {
		var val = $(this).attr('value');
		if (val != "") {
			new_val = new_val + val + " ";
		};
	});
	
	new_val = new_val + albumtitle_input.attr('value');
	
	input.attr('value',new_val);
};

function makeRequest(e) {
	e.preventDefault();
	if (input.attr('value') == input_string || input.attr('value') == '') {
		autoFillInput();
	};
	
	var input_val = input.attr('value');
	var scraper_val = select.attr('value');
	
	if ( input_val != '' ) {
		busyStart();
		
		GM_xmlhttpRequest({
			method: "POST",
			url: yadg_url + "/?xhr",
			data: "input=" + encodeURIComponent(input_val) + '&scraper=' + encodeURIComponent(scraper_val),
			headers: {
				"Content-Type": "application/x-www-form-urlencoded"
			},
			onload: function(response) {
				if (response.status == 200) {
					getResult(response.responseText);
				} else {
					div_response.text('Sorry, an error occured. Please try again.');
					lastStateError = true;
					busyStop();
				};
			},
			onerror: function(response) {
				div_response.text('Sorry, an error occured. Please try again.');
				lastStateError = true;
				busyStop();
			}
		});
	}
};

button.bind('click', makeRequest);