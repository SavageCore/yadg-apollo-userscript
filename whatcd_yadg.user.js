// ==UserScript==
// @id             what-yadg
// @name           what.cd - YADG
// @description    This script provides integration with online description generator YADG (http://yadg.cc)
// @version        0.3.0
// @namespace      yadg
// @include        http*://*what.cd/upload.php*
// @include        http*://*what.cd/requests.php*
// @include        http*://*what.cd/torrents.php*
// @include        http*://*waffles.fm/upload.php*
// @include        http*://*waffles.fm/requests.php*
// ==/UserScript==


var util = {
	exec : function exec(fn) {
		var script = document.createElement('script');
		script.setAttribute("type", "application/javascript");
		script.textContent = '(' + fn + ')();';
		document.body.appendChild(script); // run the script
		document.body.removeChild(script); // clean up
	},
	
	// handle for updating page css, taken from one of hateradio's scripts
	addCSS : function(style) {
		if(!this.style) {
			this.style = document.createElement('style');
			this.style.type = 'text/css';
			(document.head || document.getElementsByTagName('head')[0]).appendChild(this.style);
		}
		this.style.appendChild(document.createTextNode(style+'\n'));
	},
	
	setValueIfSet: function(value,input,cond) {
		if (cond) {
			input.value = value;
		} else {
			input.value = '';
		};
	},
	
	// negative count will remove, positive count will add given number of artist boxes
	addRemoveArtistBoxes : function(count) {
		if (count != 0) {
			if (count < 0) {
				for (var i = 0; i < -count; i++) {
					util.exec(function() {RemoveArtistField()});
				};
			} else {
				for (var i = 0; i < count; i++) {
					util.exec(function() {AddArtistField()});
				};
			};
		};
	},
	
	getOptionOffsets : function(select) {
		var option_offsets = {};
		for (var j = 0; j < select.options.length; j++) {
			option_offsets[select.options[j].value] = select.options[j].index;
		}
		return option_offsets;
	}
};

// very simple wrapper for XmlHttpRequest
function requester(method, url, callback) {
	var xmlhttp = new XMLHttpRequest(),
	    data = {};
	this.data = data;
	
	this.xmlhttp = xmlhttp;
	this.xmlhttp.onreadystatechange = function() {
		callback(xmlhttp,data);
	};
	this.xmlhttp.open(method,url,true);
	
	if (method == 'POST') {
		this.xmlhttp.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	};
	
	this.send = function(data) {
		this.xmlhttp.send(data);
	};
};

var factory = {
	locations : new Array(
		{
			name : 'whatcd_upload',
			regex : /http(s)?\:\/\/(.*\.)?what\.cd\/upload\.php.*/i
		},
		{
			name : 'whatcd_edit',
			regex : /http(s)?\:\/\/(.*\.)?what\.cd\/torrents\.php\?action=editgroup&groupid=.*/i
		},
		{
			name : 'whatcd_request',
			regex : /http(s)?\:\/\/(.*\.)?what\.cd\/requests\.php\?action=new/i
		},
		{
			name : 'waffles_upload',
			regex : /http(s)?\:\/\/(.*\.)?waffles\.fm\/upload\.php.*/i
		},
		{
			name : 'waffles_request',
			regex : /http(s)?\:\/\/(.*\.)?waffles\.fm\/requests\.php\?do=add/i
		}
	),
	
	determineLocation : function(uri) {
		for (var i = 0; i < this.locations.length; i++) {
			if (this.locations[i].regex.test(uri)) {
				return this.locations[i].name;
			}
		}
		return "";
	},
	
	init : function() {
		this.currentLocation = this.determineLocation(document.URL);
		this.insertIntoPage(this.getInputElements());
		
		// set the necessary styles
		this.setStyles();
		
		// add the appropriate action for the button
		var button = document.getElementById('yadg_submit');
		button.addEventListener('click',function(e) { e.preventDefault(); yadg.makeRequest();},false);
		
		// add the action for the options toggle
		var toggleLink = document.getElementById('yadg_toggle_options');
		toggleLink.addEventListener('click', function(e) {
			e.preventDefault();
			
			var optionsDiv = document.getElementById('yadg_options'),
			    display = optionsDiv.style.display;
			
			if (display == 'none' || display == '') {
				optionsDiv.style.display = 'block';
			} else {
				optionsDiv.style.display = 'none';
			};
		});
		
		// set the correct default format
		var format_select = document.getElementById('yadg_format');
		var format_offsets = util.getOptionOffsets(format_select);
		
		switch(this.currentLocation) {
			case "waffles_upload":
				format_select.selectedIndex = format_offsets["wafflesfm"];
				break;
			
			case "waffles_request":
				format_select.selectedIndex = format_offsets["wafflesfm"];
				break;
			
			default:
				format_select.selectedIndex = format_offsets["whatcd"];
				break;
		}
	},
	
	setStyles : function() {
		// general styles
		util.addCSS('div#yadg_options{ display:none; margin-top:3px; } input#yadg_input,select#yadg_scraper,input#yadg_submit,label#yadg_format_label { margin-right: 5px } div#yadg_response { margin-top:3px; }');
		
		// location specific styles will go here
		switch(this.currentLocation) {
			case "waffles_upload":
				util.addCSS('div#yadg_response ul { margin-left: 0 !important; padding-left: 0 !important; }');
				break;
			
			case "waffles_request":
				util.addCSS('div#yadg_response ul { margin-left: 0 !important; padding-left: 0 !important; }');
				break;
			
			default:

				break;
		}
	},
	
	getInputElements : function() {
		var buttonHTML = '<input type="submit" value="Fetch" id="yadg_submit"/>',
		    scraperSelectHTML = '<select name="yadg_scraper" id="yadg_scraper"><option value="beatport">Beatport</option><option value="discogs" selected="selected">Discogs</option><option value="metalarchives">Metal-Archives</option><option value="musicbrainz">Musicbrainz</option></select>',
		    optionsHTML = '<div id="yadg_options"><label for="yadg_format" id="yadg_format_label">Format:</label><select name="yadg_format" id="yadg_format"><option value="plain">plain</option><option value="wafflesfm">waffles.fm</option><option value="wafflesfm-tracks-only">waffles.fm (tracks only)</option><option value="whatcd" selected="selected">what.cd</option><option value="whatcd-tracks-only">what.cd (tracks only)</option></select></div>',
		    inputHTML = '<input type="text" name="yadg_input" id="yadg_input" size="60" />',
		    responseDivHTML = '<div id="yadg_response"></div>',
		    toggleOptionsLinkHTML = '<a id="yadg_toggle_options" href="#">Toggle options</a>';
		
		
		switch (this.currentLocation) {
			case "whatcd_upload":
				var tr = document.createElement('tr');
				tr.className = "yadg_tr";
				tr.innerHTML = '<td class="label">YADG:</td><td>' + inputHTML + scraperSelectHTML + buttonHTML + toggleOptionsLinkHTML + optionsHTML + responseDivHTML + '</td>';
				return tr;
			
			case "whatcd_edit":
				var div = document.createElement('div');
				div.className = "yadg_div";
				div.innerHTML = '<h3 class="label">YADG</h3>' + inputHTML + scraperSelectHTML + buttonHTML + toggleOptionsLinkHTML + optionsHTML + responseDivHTML;
				return div;
			
			case "whatcd_request":
				var tr = document.createElement('tr');
				tr.className = "yadg_tr";
				tr.innerHTML = '<td class="label">YADG:</td><td>' + inputHTML + scraperSelectHTML + buttonHTML + toggleOptionsLinkHTML + optionsHTML + responseDivHTML + '</td>';
				return tr;
			
			case "waffles_upload":
				var tr = document.createElement('tr');
				tr.className = "yadg_tr";
				tr.innerHTML = '<td class="heading" valign="top" align="right"><label for="yadg_input">YADG:</label></td><td>' + inputHTML + scraperSelectHTML + buttonHTML + toggleOptionsLinkHTML + optionsHTML + responseDivHTML + '</td>';
				return tr;
			
			case "waffles_request":
				var tr = document.createElement('tr');
				tr.className = "yadg_tr";
				tr.innerHTML = '<td style="text-align:left;width:100px;">YADG:</td><td style="text-align:left;">' + inputHTML + scraperSelectHTML + buttonHTML + toggleOptionsLinkHTML + optionsHTML + responseDivHTML + '</td>';
				return tr;
			
			default:
				// that should actually never happen
				return document.createElement('div');
		}
	},
	
	insertIntoPage : function(element) {
		switch (this.currentLocation) {
			case "whatcd_upload":
				var year_tr = document.getElementById('year_tr');
				year_tr.parentNode.insertBefore(element,year_tr);
				break;
			
			case "whatcd_edit":
				var summary_input = document.getElementsByName('summary')[0];
				summary_input.parentNode.insertBefore(element,summary_input.nextSibling.nextSibling);
				break;
			
			case "whatcd_request":
				var artist_tr = document.getElementById('artist_tr');
				artist_tr.parentNode.insertBefore(element,artist_tr);
				break;
			
			case "waffles_upload":
				var submit_button = document.getElementsByName('submit')[0];
				submit_button.parentNode.parentNode.parentNode.insertBefore(element,submit_button.parentNode.parentNode);
				break;
			
			case "waffles_request":
				var category_select = document.getElementsByName('category')[0];
				category_select.parentNode.parentNode.parentNode.insertBefore(element,category_select.parentNode.parentNode);
				break;
			
			default:
				break;
		}
	},
	
	getDescriptionBox : function() {
		switch (this.currentLocation) {
			case "whatcd_upload":
				return document.getElementById('album_desc');
			
			case "whatcd_edit":
				return document.getElementsByName('body')[0];
			
			case "whatcd_request":
				return document.getElementsByName('description')[0];
				
			case "waffles_upload":
				return document.getElementById('descr');
			
			case "waffles_request":
				return document.getElementsByName('information')[0];
			
			default:
				// that should actually never happen
				return document.createElement('div');
		}	
	},
	
	getFormFillFunction : function() {
		switch (this.currentLocation) {
			case "whatcd_upload":
				var f = function(rawData) {
					var artist_inputs = document.getElementsByName("artists[]"),
					    album_title_input = document.getElementById("title"),
					    year_input = document.getElementById("year"),
					    label_input = document.getElementById("record_label"),
					    catalog_input = document.getElementById("catalogue_number"),
					    tags_input = document.getElementById("tags"),
					    data = yadg.prepareRawResponse(rawData);
					
					if (data.artists != false) {
						util.addRemoveArtistBoxes(data.artists_length - artist_inputs.length);
						
						artist_inputs = document.getElementsByName("artists[]");
						
						for (var i = 0; i < artist_inputs.length; i++) {
							var artist_input = artist_inputs[i],
							    type_select = artist_input.nextSibling;
							
							while (type_select.tagName != 'SELECT') {
								type_select = type_select.nextSibling;
							};
							
							artist_input.value = data.artist_keys[i];
							
							option_offsets = util.getOptionOffsets(type_select);
							
							if (data.artists[data.artist_keys[i]] == "Remixer") {
								type_select.selectedIndex = option_offsets[3];
							} else if (data.artists[data.artist_keys[i]] == "Feature") {
								type_select.selectedIndex = option_offsets[2];
							} else {
								type_select.selectedIndex = option_offsets[1];
							};
						};
					} else {
						for (var i = 0; i < artist_inputs.length; i++) {
							artist_inputs[i].value = '';
						};
					};
					
					
					util.setValueIfSet(data.year,year_input,data.year != false);
					util.setValueIfSet(data.title,album_title_input,data.title != false);
					util.setValueIfSet(data.label,label_input,data.label != false);
					util.setValueIfSet(data.catalog,catalog_input,data.catalog != false);
					util.setValueIfSet(data.tag_string.toLowerCase(),tags_input,data.tags != false);
				};
				return f;
			
			case "whatcd_edit":
				f = function(rawData) {
					var year_input = document.getElementsByName("year")[0],
					    label_input = document.getElementsByName("record_label")[0],
					    catalog_input = document.getElementsByName("catalogue_number")[0],
					    data = yadg.prepareRawResponse(rawData);
					
					util.setValueIfSet(data.year,year_input,data.year != false);
					util.setValueIfSet(data.label,label_input,data.label != false);
					util.setValueIfSet(data.catalog,catalog_input,data.catalog != false);
				};
				return f;
			
			case "whatcd_request":
				var f = function(rawData) {
					var artist_inputs = document.getElementsByName("artists[]"),
					    album_title_input = document.getElementsByName("title")[0],
					    year_input = document.getElementsByName("year")[0],
					    catalog_input = document.getElementsByName("cataloguenumber")[0],
					    tags_input = document.getElementById("tags"),
					    data = yadg.prepareRawResponse(rawData);
					
					if (data.artists != false) {
						util.addRemoveArtistBoxes(data.artists_length - artist_inputs.length);
						
						artist_inputs = document.getElementsByName("artists[]");
						
						for (var i = 0; i < artist_inputs.length; i++) {
							var artist_input = artist_inputs[i],
							    type_select = artist_input.nextSibling;
							    
							while (type_select.tagName != 'SELECT') {
								type_select = type_select.nextSibling;
							};
							
							artist_input.value = data.artist_keys[i];
							
							option_offsets = util.getOptionOffsets(type_select);
							
							if (data.artists[data.artist_keys[i]] == "Remixer") {
								type_select.selectedIndex = option_offsets[3];
							} else if (data.artists[data.artist_keys[i]] == "Feature") {
								type_select.selectedIndex = option_offsets[2];
							} else {
								type_select.selectedIndex = option_offsets[1];
							};
						};
					} else {
						for (var i = 0; i < artist_inputs.length; i++) {
							artist_inputs[i].value = '';
						};
					};
					
					
					util.setValueIfSet(data.year,year_input,data.year != false);
					util.setValueIfSet(data.title,album_title_input,data.title != false);
					util.setValueIfSet(data.catalog,catalog_input,data.catalog != false);
					util.setValueIfSet(data.tag_string.toLowerCase(),tags_input,data.tags != false);
				};
				return f;
			
			case "waffles_upload":
				var f = function(rawData) {
					var artist_input = document.getElementsByName("artist")[0],
					    album_title_input = document.getElementsByName("album")[0],
					    year_input = document.getElementsByName("year")[0],
					    va_checkbox = document.getElementById("va"),
					    tags_input = document.getElementById("tags"),
					    data = yadg.prepareRawResponse(rawData);
					
					if (data.artists != false) {
						if (data.is_various) {
							artist_input.value = "";
							va_checkbox.checked = true;
						} else {
							va_checkbox.checked = false;
							
							var artist_string = "";
							
							for (var i = 0; i < data.artists_length; i++) {
								artist_string = artist_string + data.artist_keys[i];
								if (i < data.artists_length - 2) {
									artist_string = artist_string + ", ";
								} else if (i == data.artists_length - 2) {
									artist_string = artist_string + " & ";
								}
							}

							artist_input.value = artist_string;
						}
					} else {
						va_checkbox.checked = false;
						artist_input.value = "";
					};
					
					util.setValueIfSet(data.year,year_input,data.year != false);
					util.setValueIfSet(data.title,album_title_input,data.title != false);
					util.setValueIfSet(data.tag_string_nodots.toLowerCase(),tags_input,data.tags != false);
					
					util.exec(function() {formatName()});
				};
				return f;
			
			case "waffles_request":
				var f = function(rawData) {
					var artist_input = document.getElementsByName("artist")[0],
					    album_title_input = document.getElementsByName("title")[0],
					    year_input = document.getElementsByName("year")[0],
					    data = yadg.prepareRawResponse(rawData);
					
					if (data.artists != false) {
						if (data.is_various) {
							artist_input.value = "Various Artists";
						} else {
							var artist_string = "";
							
							for (var i = 0; i < data.artists_length; i++) {
								artist_string = artist_string + data.artist_keys[i];
								if (i < data.artists_length - 2) {
									artist_string = artist_string + ", ";
								} else if (i == data.artists_length - 2) {
									artist_string = artist_string + " & ";
								}
							}

							artist_input.value = artist_string;
						}
					} else {
						artist_input.value = "";
					};
					
					util.setValueIfSet(data.year,year_input,data.year != false);
					util.setValueIfSet(data.title,album_title_input,data.title != false);
				};
				return f;
			
			default:
				// that should actually never happen
				return function(data) {};
		}
	}
};

var yadg = {
	baseURL : "http://yadg.cc",
	
	standardError : "Sorry, an error occured. Please try again.",
	lastStateError : false,
	
	init : function() {
		this.scraperSelect = document.getElementById('yadg_scraper');
		this.formatSelect = document.getElementById('yadg_format');
		this.input = document.getElementById('yadg_input');
		this.responseDiv = document.getElementById('yadg_response');
		this.button = document.getElementById('yadg_submit');
	},
	
	makeRequest : function() {
		var scraper = this.scraperSelect.options[this.scraperSelect.selectedIndex].value,
		    format = this.formatSelect.options[this.formatSelect.selectedIndex].value,
		    inputValue = this.input.value;
		
		var request = new requester('POST',this.baseURL + '/?xhr', function(request,data) {
			if (request.readyState==4 && request.status==200) {
				yadg.getResult(request.responseText,format);
			} else if (request.readyState==4 && request.status!=200) {
				yadg.printError(yadg.standardError);
				yadg.busyStop();
			};
		});
		this.busyStart();
		request.send('input=' + encodeURIComponent(inputValue) + '&scraper=' + encodeURIComponent(scraper));
	},
	
	getResult : function(id,format) {
		var request = new requester('GET',this.baseURL + '/result/' + id + '?xhr&f=' + format, function(request,data) {
			if (request.readyState==4 && request.status==200) {
				var response = JSON.parse(request.responseText);
				
				if (response[0] == 'result') {
					factory.getDescriptionBox().value = response[1];
					
					if (yadg.lastStateError == true) {
						yadg.responseDiv.innerHTML = "";
						yadg.lastStateError == false;
					};
					
					yadg.fillFormValuesFromId(data.id);
					
				} else if (response[0] == 'list') {
					var ul = document.createElement('ul');
					ul.id = "yadg_release_list";
					
					var scraper_results = response[1];
					for (scraper in scraper_results) {
						var release_list = scraper_results[scraper];
						for (var i = 0; i < release_list.length;i++) {
							var name = release_list[i]['name'],
								info = release_list[i]['info'],
								id = release_list[i]['release'];
							
							var li = document.createElement('li'),
							    a = document.createElement('a');
							
							a.textContent = name;
							a.href = yadg.baseURL + '/get/' + scraper + '/' + id;
							
							a.addEventListener('click',function(e) { e.preventDefault(); yadg.makeRequestByUrl(this.href);},false);
							
							li.appendChild(a);
							li.appendChild(document.createElement('br'));
							li.appendChild(document.createTextNode(info));
							
							ul.appendChild(li);
						};
					};
					
					if (ul.childNodes.length != 0) {
						yadg.responseDiv.innerHTML = "";
						yadg.responseDiv.appendChild(ul);
						yadg.lastStateError == false;
					} else {
						yadg.printError('Sorry, there were no matches.');
					}
					yadg.busyStop();
				} else if (response[0] == 'notfound') {
					yadg.printError('I could not find the release with the given ID. You may want to try again with another one.');
					yadg.busyStop();
				} else if (response[0] == 'waiting') {
					var delay = function() { yadg.getResult(data.id,data.format); };
					window.setTimeout(delay, 1000);
				} else {
					yadg.printError('Something weird happened. Please try again');
					yadg.busyStop();
				}
			} else if (request.readyState==4 && request.status!=200) {
				yadg.printError(yadg.standardError);
				yadg.busyStop();
			};
		});
		request.data.id = id;
		request.data.format = format;
		request.send();
	},
	
	fillFormValuesFromId : function(id) {
		var request = new requester('GET',this.baseURL + '/result/' + id + '?xhr&f=raw', function(request,data) {
			if (request.readyState==4 && request.status==200) {
				var result = JSON.parse(request.responseText),
				    fillFunc = factory.getFormFillFunction();
				fillFunc(result[1]);
			};
			yadg.busyStop();
		});
		request.send();
	},
	
	makeRequestByUrl : function(url) {
		var format = this.formatSelect.options[this.formatSelect.selectedIndex].value;
		
		var request = new requester('GET',url + '?xhr', function(request,data) {
			if (request.readyState==4 && request.status==200) {
				yadg.getResult(request.responseText,format);
			} else if (request.readyState==4 && request.status!=200) {
				yadg.printError(yadg.standardError);
				yadg.busyStop();
			};
		});
		this.busyStart();
		request.send();
	},
	
	printError : function(message) {
		this.responseDiv.innerHTML = "";
		this.responseDiv.appendChild(document.createTextNode(message));
		this.lastStateError = true;
	},
	
	busyStart : function() {
		this.button.setAttribute('disabled',true);
		this.button.value = "Please wait...";
		this.input.setAttribute('disabled',true);
		this.scraperSelect.setAttribute('disabled',true);
		this.formatSelect.setAttribute('disabled',true);
	},
	
	busyStop : function() {
		this.button.removeAttribute('disabled');
		this.button.value = "Fetch";
		this.input.removeAttribute('disabled');
		this.scraperSelect.removeAttribute('disabled');
		this.formatSelect.removeAttribute('disabled');
	},
	
	prepareRawResponse : function(rawData) {
		var result = {};
		
		result.artists = false;
		result.year = false;
		result.title = false;
		result.label = false;
		result.catalog = false;
		result.genre = false;
		result.style = false;
		result.tags = false;
		result.is_various = false;

		if (rawData.hasOwnProperty('artists')) {
			result.artists = {};
			
			for (var i in rawData.artists) {
				var artist = rawData.artists[i];
				if (artist["name"] != "Various") {
					result.artists[artist["name"]] = artist["type"];
				} else {
					result.is_various = true;
				};
			};
		};
		if (rawData.hasOwnProperty('discs')) {
			for (var key in rawData.discs) {
				for (var i in rawData.discs[key]) {
					var track = rawData.discs[key][i];
					for (var j in track[1]) {
						var name = track[1][j]["name"],
							type = track[1][j]["type"];
						if ( !(name in result.artists) || (type == "Main" && result.artists[name] != "Main") ) {
							result.artists[name] = type;
						};
					};
				};
			};
		};
		if (rawData.hasOwnProperty('released')) {
			result.year = rawData.released.match(/\d{4}/)[0];
			if (result.year.length != 4) {
				result.year = false;
			};
		};
		if (rawData.hasOwnProperty('title')) {
			result.title = rawData.title;
		};
		if (rawData.hasOwnProperty('label')) {
			result.label = rawData.label[0];
		};
		if (rawData.hasOwnProperty('catalog')) {
			result.catalog = rawData.catalog[0];
		};
		if (rawData.hasOwnProperty('genre')) {
			result.genre = rawData.genre;
		};
		if (rawData.hasOwnProperty('style')) {
			result.style = rawData.style;
		};
		if (result.genre != false && result.style != false) {
			result.tags = rawData.genre.concat(rawData.style);
		} else if (result.genre != false) {
			result.tags = rawData.genre;
		} else if (result.style != false) {
			result.tags = rawData.style;
		}
		
		if (result.tags != false) {
			result.tag_string = "";
			result.tag_string_nodots = "";
			
			for (var i = 0; i < result.tags.length; i++) {
				result.tag_string = result.tag_string + result.tags[i].replace(/\s+/g,'.');
				result.tag_string_nodots = result.tag_string_nodots + result.tags[i].replace(/\s+/g,' ');
				if (i != result.tags.length-1) {
					result.tag_string = result.tag_string + ', ';
					result.tag_string_nodots = result.tag_string_nodots + ', ';
				};
			};
		};
		
		if (result.artists != false) {
			// count the artists
			result.artists_length = 0;
			result.artist_keys = [];
			
			for (var i in result.artists) {
				if (result.artists.hasOwnProperty(i)) {
					result.artists_length++;
					result.artist_keys.push(i);
				};
			};
		};
		
		if (result.artists_length == 0) {
			result.artists = false;
		}
		
		return result;
	}
};

factory.init();
yadg.init();