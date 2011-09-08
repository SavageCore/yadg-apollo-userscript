// ==UserScript==
// @id             what-yadg
// @name           what.cd - YADG
// @description    This script provides integration with online description generator YADG (http://yadg.dyndns.org)
// @version        0.0.2
// @namespace      yadg
// @include        http*://*what.cd/upload.php*
// @require        https://ajax.googleapis.com/ajax/libs/jquery/1.6.3/jquery.js
// ==/UserScript==

$(document).ready(function(){
	var album_desc = $("textarea#album_desc"),
		tr_albumtitle = $("tr#title_tr"),
		input = $('<input type="text" name="input" id="yadg_input" size="60" />'),
		button = $('<input type="submit" value="Fetch" id="yadg_submit"/>'),
		tr = $('<tr id="yadg_tr"></tr>'),
		td_label = $('<td class="label">YADG:</td>'),
		td_content = $('<td></td>'),
		div_response = $('<div id="yadg_response"></div>');
	
	var input_string = "Enter discogs url, id or search term";

	td_content.append(input);
	td_content.append(button);
	td_content.append(div_response);
	tr.append(td_label);
	tr.append(td_content);
	tr_albumtitle.after(tr);
	
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
		button.attr('disabled',true);
		button.attr('value','Please wait...');
	};
	
	function busyStop() {
		button.attr('value','Fetch');
		input.attr('disabled',false);
		button.attr('disabled',false);
	};
		
	var lastStateError = false;
	
	function makeRequestByDiscogsId(e) {
		e.preventDefault();
		busyStart();
		GM_xmlhttpRequest({
			method: "GET",
			url: "http://yadg.dyndns.org/get/" + $(this).attr('id') + "?xhr",
			onload: function(response) {
				getResult(response.responseText);
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
			url: "http://yadg.dyndns.org/result/" + id + "?xhr",
			onload: function(response) {
				var data = jQuery.parseJSON(response.responseText);
				
				if (data[0] == 'result') {
					album_desc.text(data[1]);
					var new_position = album_desc.offset();
					window.scrollTo(new_position.left,new_position.top);
					if (lastStateError == true) {
						div_response.empty();
					};
					lastStateError == false;
					busyStop();
				} else if (data[0] == 'list') {
					var ul = $('<ul id="yadg_release_list"></ul>');
					
					for (var i = 0; i < data[1].length;i++) {
						var name = data[1][i]['name'],
							info = data[1][i]['info'],
							id = data[1][i]['release'];
						
						var li = $('<li></li>');
						var a = $('<a href="#">'+name+'</a>');
						a.attr('id',id);
						a.bind('click', makeRequestByDiscogsId);
						
						li.css('margin-bottom','5px');
						li.append(a);
						li.append('<br />')
						li.append(info);
						
						ul.append(li);
					}
					
					if (data[1].length != 0) {
						div_response.empty();
						div_response.append(ul);
						lastStateError == false;
					} else {
						div_response.text('Sorry, there were no matches.');
						lastStateError = true;
					}
					busyStop();
				} else if (data[0] == 'notfound') {
					div_response.text('I could not find the release with the given ID on Discogs. You may want to try again with another one.');
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
		
		if ( input_val != '' ) {
			busyStart();
			
			GM_xmlhttpRequest({
				method: "POST",
				url: "http://yadg.dyndns.org/?xhr",
				data: "input=" + encodeURIComponent(input_val),
				headers: {
					"Content-Type": "application/x-www-form-urlencoded"
				},
				onload: function(response) {
					getResult(response.responseText);
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
});