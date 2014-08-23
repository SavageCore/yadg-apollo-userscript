// ==UserScript==
// @id             what-yadg
// @name           what.cd - YADG
// @description    This script provides integration with online description generator YADG (http://yadg.cc)
// @version        0.8.0
// @namespace      yadg
// @grant          GM_xmlhttpRequest
// @require        http://localhost:8000/static/js/jsandbox.min.js
// @include        http*://*what.cd/upload.php*
// @include        http*://*what.cd/requests.php*
// @include        http*://*what.cd/torrents.php*
// @include        http*://*waffles.fm/upload.php*
// @include        http*://*waffles.fm/requests.php*
// ==/UserScript==

// --------- USER SETTINGS START ---------

/*
 Here you can set site specific default formats.
 You can find a list of available formats at: http://yadg.cc/api/v1/formats/
*/
var defaultWhatFormat = "whatcd-tracks-only",
    defaultWafflesFormat = "wafflesfm";

// --------- USER SETTINGS END ---------



// --------- THIRD PARTY CODE AREA START ---------

//
// Creates an object which gives some helper methods to
// Save/Load/Remove data to/from the localStorage
//
// Source from: https://github.com/gergob/localstoragewrapper
//
function LocalStorageWrapper (applicationPrefix) {
    "use strict";

    if(applicationPrefix == undefined) {
        throw new Error('applicationPrefix parameter should be defined');
    }

    var delimiter = '_';

    //if the passed in value for prefix is not string, it should be converted
    var keyPrefix = typeof(applicationPrefix) === 'string' ? applicationPrefix : JSON.stringify(applicationPrefix);

    var localStorage = window.localStorage||unsafeWindow.localStorage;

    var isLocalStorageAvailable = function() {
        return typeof(localStorage) != undefined
    }

    var getKeyPrefix = function() {
        return keyPrefix;
    }

    //
    // validates if there is a prefix defined for the keys
    // and checks if the localStorage functionality is available or not
    //
    var makeChecks = function(key) {
        var prefix = getKeyPrefix();
        if(prefix == undefined) {
            throw new Error('No prefix was defined, data cannot be saved');
        }

        if(!isLocalStorageAvailable()) {
            throw new Error('LocalStorage is not supported by your browser, data cannot be saved');
        }

        //keys are always strings
        var checkedKey = typeof(key) === 'string' ? key : JSON.stringify(key);

        return checkedKey;
    }

    //
    // saves the value associated to the key into the localStorage
    //
    var addItem = function(key, value) {
        var that = this;
        try{
            var checkedKey = makeChecks(key);
            var combinedKey = that.getKeyPrefix() + delimiter + checkedKey;
            localStorage.setItem(combinedKey, JSON.stringify(value));
        }
        catch(error) {
            console.log(error);
            throw error;
        }
    }

    //
    // gets the value of the object saved to the key passed as parameter
    //
    var getItem = function(key) {
        var that = this;
        var result = undefined;
        try{
            var checkedKey = makeChecks(key);
            var combinedKey = that.getKeyPrefix() + delimiter + checkedKey;
            var resultAsJSON = localStorage.getItem(combinedKey);
            result = JSON.parse(resultAsJSON);
        }
        catch(error) {
            console.log(error);
            throw error;
        }
        return result;
    }

    //
    // returns all the keys from the localStorage
    //
    var getAllKeys = function() {
        var prefix = getKeyPrefix();
        var results = [];

        if(prefix == undefined) {
            throw new Error('No prefix was defined, data cannot be saved');
        }

        if(!isLocalStorageAvailable()) {
            throw new Error('LocalStorage is not supported by your browser, data cannot be saved');
        }

        for(var key in localStorage) {
            if(key.indexOf(prefix) == 0) {
                var keyParts = key.split(delimiter);
                results.push(keyParts[1]);
            }
        }

        return results;
    }

    //
    // removes the value associated to the key from the localStorage
    //
    var removeItem = function(key) {
        var that = this;
        var result = false;
        try{
            var checkedKey = makeChecks(key);
            var combinedKey = that.getKeyPrefix() + delimiter + checkedKey;
            localStorage.removeItem(combinedKey);
            result = true;
        }
        catch(error) {
            console.log(error);
            throw error;
        }
        return result;
    }

    //
    // removes all the values from the localStorage
    //
    var removeAll = function() {
        var that = this;

        try{
            var allKeys = that.getAllKeys();
            for(var i=0; i < allKeys.length; ++i) {
                var checkedKey = makeChecks(allKeys[i]);
                var combinedKey = that.getKeyPrefix() + delimiter + checkedKey;
                localStorage.removeItem(combinedKey);
            }
        }
        catch(error) {
            console.log(error);
            throw error;
        }
    }

    // make some of the functionalities public
    return {
        isLocalStorageAvailable : isLocalStorageAvailable,
        getKeyPrefix : getKeyPrefix,
        addItem : addItem,
        getItem : getItem,
        getAllKeys : getAllKeys,
        removeItem : removeItem,
        removeAll : removeAll
    }
};

// --------- THIRD PARTY CODE AREA END ---------

var yadg_util = {
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
        }
    },

    // negative count will remove, positive count will add given number of artist boxes
    addRemoveArtistBoxes : function(count) {
        if (count != 0) {
            if (count < 0) {
                for (var i = 0; i < -count; i++) {
                    yadg_util.exec(function() {RemoveArtistField()});
                }
            } else {
                for (var i = 0; i < count; i++) {
                    yadg_util.exec(function() {AddArtistField()});
                }
            }
        }
    },

    getOptionOffsets : function(select) {
        var option_offsets = {};
        for (var j = 0; j < select.options.length; j++) {
            option_offsets[select.options[j].value] = select.options[j].index;
        }
        return option_offsets;
    },

    storage : new LocalStorageWrapper("yadg")
};

// very simple wrapper for XmlHttpRequest
function requester(url, method, callback, data) {
    this.data = {};
    this.url = url;
    this.method = method;

    this.send = function() {
        details = {
            url : this.url,
            method : this.method,
            onload : function(response) {
                if (response.status === 200) {
                    callback(JSON.parse(response.responseText));
                } else {
                    yadg.failed_callback();
                }
            },
            onerror : yadg.failed_callback
        };
        if (method == "POST") {
            details.data = JSON.stringify(this.data);
        }

        var headers = {
            Accept : "application/json"
        };

        if (yadg_util.storage.getItem('api_token')) {
            headers.Authorization = "Token " + yadg_util.storage.getItem('api_token');
        }

        details.headers = headers;

        GM_xmlhttpRequest(details);
    };
}

var yadg_sandbox = {
    init : function(callback) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: yadg.yadgHost + '/static/js/jsandbox-worker.js',
            onload: function(response) {
                var script, dataURL = null;
                if (response.status === 200) {
                    script = response.responseText;
                    var blob = new Blob([script], {type: 'application/javascript'});
                    var URL = window.webkitURL || window.URL;
                    var dataURL = URL.createObjectURL(blob);
                    yadg_sandbox.initCallback(dataURL);
                } else {
                    yadg_sandbox.initCallbackError();
                }
                callback();
            },
            onerror: function() {
                yadg_sandbox.initCallbackError();
                callback();
            }
        });

    },

    loadSwig : function() {
        // importScripts for the web worker will not work in Firefox with cross-domain requests
        // see: https://bugzilla.mozilla.org/show_bug.cgi?id=756589
        // so download the Swig files manually with GM_xmlhttpRequest
        GM_xmlhttpRequest({
            method: 'GET',
            url: yadg.yadgHost + "/static/js/swig.min.js",
            onload: function(response) {
                if (response.status === 200) {
                    yadg_sandbox.swig_script = response.responseText;

                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: yadg.yadgHost + "/static/js/swig.custom.js",
                        onload: function(response) {
                            if (response.status === 200) {
                                yadg_sandbox.swig_custom_script = response.responseText;
                                yadg_sandbox.initializeSwig({});
                            }
                        }
                    });
                }
            }
        });
    },

    initializeSwig : function(templates) {
        if (!(this.swig_script && this.swig_custom_script)) {
            yadg.failed_callback();
            return
        }

        yadg_sandbox.exec({data: this.swig_script, onerror: yadg.failed_callback});
        yadg_sandbox.exec({data: this.swig_custom_script, onerror: yadg.failed_callback});
        yadg_sandbox.exec({data: "var myswig = new swig.Swig({ loader: swig.loaders.memory(input.templates), autoescape: false }), i=0; yadg_filters.register_filters(myswig);", input: {templates: {}}});
    },

    renderTemplate : function(template, data, callback, error) {
        eval_string = "myswig.render(input.template, { locals: input.data, filename: 'scratchpad' + (i++) })";
        this.eval({data: eval_string, callback: function(out) {callback(out);}, input: {template: template, data: data}, onerror: function(err){error(err);}});
    },

    initCallback : function(dataUrl) {
        JSandbox.url = dataUrl;
        this.jsandbox = new JSandbox();
        this.loadSwig();
        this.initError = false;
    },

    resetSandbox : function() {
        this.jsandbox.terminate();
        this.jsandbox = new JSandbox();
    },

    load : function(options) {
        this.jsandbox.load(options);
    },

    exec : function(options) {
        this.jsandbox.exec(options);
    },

    eval : function(options) {
        this.jsandbox.eval(options);
    },

    initCallbackError : function() {
        this.initError = true;
    }
};

var factory = {
    KEY_LAST_CHECKED : "lastChecked",
    KEY_SCRAPER_LIST : "scraperList",
    KEY_FORMAT_LIST : "formatList",

    CACHE_TIMEOUT : 1000*60*60*24, // 24 hours

    UPDATE_PROGRESS : 0,

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
            name : 'whatcd_torrent_overview',
            regex : /http(s)?\:\/\/(.*\.)?what\.cd\/torrents\.php\?id=.*/i
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

    determineSSL : function(uri) {
        return uri.indexOf("https://") == 0
    },

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
        this.isSSL = this.determineSSL(document.URL);
        this.insertIntoPage(this.getInputElements());

        // set the necessary styles
        this.setStyles();

        // add the appropriate action for the button
        var button = document.getElementById('yadg_submit');
        button.addEventListener('click',function(e) { e.preventDefault();
            //yadg.makeRequest();
            yadg_sandbox.renderTemplate("test {{ i }}", {i: 3}, alert);},false);

        // add the action for the options toggle
        var toggleLink = document.getElementById('yadg_toggle_options');
        if (toggleLink !== null) {
            toggleLink.addEventListener('click', function(e) {
                e.preventDefault();

                var optionsDiv = document.getElementById('yadg_options'),
                    display = optionsDiv.style.display;

                if (display == 'none' || display == '') {
                    optionsDiv.style.display = 'block';
                } else {
                    optionsDiv.style.display = 'none';
                }
            });
        }

        // add the action to the clear cache link
        var clearCacheLink = document.getElementById('yadg_clear_cache');
        if (clearCacheLink !== null) {
            clearCacheLink.addEventListener('click', function(e) {
                e.preventDefault();

                yadg_util.storage.removeAll();

                alert("Cache cleared. Please reload the page for this to take effect.");
            });
        }

        // set the correct default format
        factory.setDefaultFormat();

        // tell the yadg object if we are browsing the site using ssl
        yadg.setSSL(this.isSSL);

        var last_checked = yadg_util.storage.getItem(factory.KEY_LAST_CHECKED);
        if (last_checked === null || (new Date()).getTime() - (new Date(last_checked)).getTime() > factory.CACHE_TIMEOUT) {
            // update the scraper and formats list
            factory.UPDATE_PROGRESS = 1;
            //yadg.getScraperList(factory.setScraperSelect);
            //yadg.getFormatsList(factory.setFormatSelect);
        } else {
            factory.setScraperSelect(yadg_util.storage.getItem(factory.KEY_SCRAPER_LIST));
            factory.setFormatSelect(yadg_util.storage.getItem(factory.KEY_FORMAT_LIST));
        }
    },

    setDefaultFormat : function() {
        var format_select = document.getElementById('yadg_format');
        var format_offsets = yadg_util.getOptionOffsets(format_select);

        switch(this.currentLocation) {
            case "waffles_upload":
                format_select.selectedIndex = format_offsets[defaultWafflesFormat];
                break;

            case "waffles_request":
                format_select.selectedIndex = format_offsets[defaultWafflesFormat];
                break;

            default:
                format_select.selectedIndex = format_offsets[defaultWhatFormat];
                break;
        }
    },

    setScraperSelect : function(scrapers) {
        var scraper_select = document.getElementById("yadg_scraper");

        factory.setSelect(scraper_select, scrapers);

        if (factory.UPDATE_PROGRESS > 0) {
            yadg_util.storage.addItem(factory.KEY_SCRAPER_LIST, response_data);
            factory.UPDATE_PROGRESS |= 1<<1;

            if (factory.UPDATE_PROGRESS === 7) {
                yadg_util.storage.addItem(factory.KEY_LAST_CHECKED, new Date());
            }
        }
    },

    setFormatSelect : function(templates) {
        var format_select = document.getElementById("yadg_format");

        var non_utility = [];
        for (var i = 0; i < templates.length; i++) {
            if (!templates[i]['is_utility']) {
                non_utility.push(templates[i]);
            }
        }

        factory.setSelect(format_select, non_utility);
        factory.setDefaultFormat();

        if (factory.UPDATE_PROGRESS > 0) {
            yadg_util.storage.addItem(factory.KEY_FORMAT_LIST, response_data);
            factory.UPDATE_PROGRESS |= 1<<2;

            if (factory.UPDATE_PROGRESS === 7) {
                yadg_util.storage.addItem(factory.KEY_LAST_CHECKED, new Date());
            }
        }
    },

    setSelect : function(select, data) {
        select.options.length = data.length;

        for (var i = 0; i < data.length; i++) {
            // we are not using the javascript constructor to create an Option instance because this will create an
            // incompatibility with jQuery in Chrome which will make it impossible to add a new artist field on What.cd
            var o = document.createElement("option");
            o.text = data[i]['name'];
            o.value = data[i]['value'] || data[i]['id'];
            o.selected = data[i]['default'];
            select.options[i] = o;
            if (data[i]['default']) {
                select.selectedIndex = i;
            }
        }
    },

    setStyles : function() {
        // general styles
        yadg_util.addCSS('div#yadg_options{ display:none; margin-top:3px; } input#yadg_input,input#yadg_submit,label#yadg_format_label,a#yadg_scraper_info { margin-right: 5px } div#yadg_response { margin-top:3px; } select#yadg_scraper { margin-right: 2px }');

        // location specific styles will go here
        switch(this.currentLocation) {
            case "waffles_upload":
                yadg_util.addCSS('div#yadg_response ul { margin-left: 0 !important; padding-left: 0 !important; }');
                break;

            case "waffles_request":
                yadg_util.addCSS('div#yadg_response ul { margin-left: 0 !important; padding-left: 0 !important; }');
                break;

            default:

                break;
        }
    },

    getInputElements : function() {
        var buttonHTML = '<input type="submit" value="Fetch" id="yadg_submit"/>',
            scraperSelectHTML = '<select name="yadg_scraper" id="yadg_scraper"><option value="beatport">Beatport</option><option value="discogs" selected="selected">Discogs</option><option value="metalarchives">Metal-Archives</option><option value="musicbrainz">Musicbrainz</option></select>',
            optionsHTML = '<div id="yadg_options"><label for="yadg_format" id="yadg_format_label">Format:</label><select name="yadg_format" id="yadg_format"><option value="plain">plain</option><option value="wafflesfm">waffles.fm</option><option value="wafflesfm-tracks-only">waffles.fm (tracks only)</option><option value="whatcd" selected="selected">what.cd</option><option value="whatcd-tracks-only">what.cd (tracks only)</option></select> <span class="yadg_separator">|</span> <a id="yadg_clear_cache" href="#">Clear cache</a></div>',
            inputHTML = '<input type="text" name="yadg_input" id="yadg_input" size="60" />',
            responseDivHTML = '<div id="yadg_response"></div>',
            toggleOptionsLinkHTML = '<a id="yadg_toggle_options" href="#">Toggle options</a>',
            scraperInfoLink = '<a id="yadg_scraper_info" href="https://yadg.cc/available-scrapers" target="_blank" title="Get additional information on the available scrapers">[?]</a>';


        switch (this.currentLocation) {
            case "whatcd_upload":
                var tr = document.createElement('tr');
                tr.className = "yadg_tr";
                tr.innerHTML = '<td class="label">YADG:</td><td>' + inputHTML + scraperSelectHTML + scraperInfoLink + buttonHTML + toggleOptionsLinkHTML + optionsHTML + responseDivHTML + '</td>';
                return tr;

            case "whatcd_edit":
                var div = document.createElement('div');
                div.className = "yadg_div";
                div.innerHTML = '<h3 class="label">YADG</h3>' + inputHTML + scraperSelectHTML + scraperInfoLink + buttonHTML + toggleOptionsLinkHTML + optionsHTML + responseDivHTML;
                return div;

            case "whatcd_torrent_overview":
                var div = document.createElement('div');
                div.className = "yadg_div";
                div.innerHTML = '<h3 class="label">YADG</h3>' + '<input type="text" name="yadg_input" id="yadg_input" />' + scraperSelectHTML + scraperInfoLink + buttonHTML + optionsHTML + responseDivHTML;
                return div;

            case "whatcd_request":
                var tr = document.createElement('tr');
                tr.className = "yadg_tr";
                tr.innerHTML = '<td class="label">YADG:</td><td>' + inputHTML + scraperSelectHTML + scraperInfoLink + buttonHTML + toggleOptionsLinkHTML + optionsHTML + responseDivHTML + '</td>';
                return tr;

            case "waffles_upload":
                var tr = document.createElement('tr');
                tr.className = "yadg_tr";
                tr.innerHTML = '<td class="heading" valign="top" align="right"><label for="yadg_input">YADG:</label></td><td>' + inputHTML + scraperSelectHTML + scraperInfoLink + buttonHTML + toggleOptionsLinkHTML + optionsHTML + responseDivHTML + '</td>';
                return tr;

            case "waffles_request":
                var tr = document.createElement('tr');
                tr.className = "yadg_tr";
                tr.innerHTML = '<td style="text-align:left;width:100px;">YADG:</td><td style="text-align:left;">' + inputHTML + scraperSelectHTML + scraperInfoLink + buttonHTML + toggleOptionsLinkHTML + optionsHTML + responseDivHTML + '</td>';
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

            case "whatcd_torrent_overview":
                var add_artists_box = document.getElementsByClassName("box_addartists")[0];
                add_artists_box.appendChild(element);
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

            case "whatcd_torrent_overview":
                if (!this.hasOwnProperty("dummybox")) {
                    this.dummybox = document.createElement('div');
                }
                return this.dummybox;

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
                        yadg_util.addRemoveArtistBoxes(data.artists_length - artist_inputs.length);

                        artist_inputs = document.getElementsByName("artists[]");

                        for (var i = 0; i < artist_inputs.length; i++) {
                            var artist_input = artist_inputs[i],
                                type_select = artist_input.nextSibling;

                            while (type_select.tagName != 'SELECT') {
                                type_select = type_select.nextSibling;
                            }

                            artist_input.value = data.artist_keys[i];

                            option_offsets = yadg_util.getOptionOffsets(type_select);

                            if (data.artists[data.artist_keys[i]] == "Remixer") {
                                type_select.selectedIndex = option_offsets[3];
                            } else if (data.artists[data.artist_keys[i]] == "Feature") {
                                type_select.selectedIndex = option_offsets[2];
                            } else {
                                type_select.selectedIndex = option_offsets[1];
                            }
                        }
                    } else {
                        for (var i = 0; i < artist_inputs.length; i++) {
                            artist_inputs[i].value = '';
                        }
                    }

                    if (data.tags != false) {
                        tags_input.value = data.tag_string.toLowerCase();
                    } else {
                        tags_input.value = '';
                    }

                    yadg_util.setValueIfSet(data.year,year_input,data.year != false);
                    yadg_util.setValueIfSet(data.title,album_title_input,data.title != false);
                    yadg_util.setValueIfSet(data.label,label_input,data.label != false);
                    yadg_util.setValueIfSet(data.catalog,catalog_input,data.catalog != false);
                };
                return f;

            case "whatcd_edit":
                f = function(rawData) {
                    var year_input = document.getElementsByName("year")[0],
                        label_input = document.getElementsByName("record_label")[0],
                        catalog_input = document.getElementsByName("catalogue_number")[0],
                        data = yadg.prepareRawResponse(rawData);

                    yadg_util.setValueIfSet(data.year,year_input,data.year != false);
                    yadg_util.setValueIfSet(data.label,label_input,data.label != false);
                    yadg_util.setValueIfSet(data.catalog,catalog_input,data.catalog != false);
                };
                return f;

            case "whatcd_torrent_overview":
                f = function(rawData) {
                    var artist_inputs = document.getElementsByName("aliasname[]"),
                        data = yadg.prepareRawResponse(rawData);

                    if (data.artists != false) {
                        yadg_util.addRemoveArtistBoxes(data.artists_length - artist_inputs.length);

                        artist_inputs = document.getElementsByName("aliasname[]");

                        for (var i = 0; i < artist_inputs.length; i++) {
                            var artist_input = artist_inputs[i],
                                type_select = artist_input.nextSibling;

                            while (type_select.tagName != 'SELECT') {
                                type_select = type_select.nextSibling;
                            }

                            artist_input.value = data.artist_keys[i];

                            option_offsets = yadg_util.getOptionOffsets(type_select);

                            if (data.artists[data.artist_keys[i]] == "Remixer") {
                                type_select.selectedIndex = option_offsets[3];
                            } else if (data.artists[data.artist_keys[i]] == "Feature") {
                                type_select.selectedIndex = option_offsets[2];
                            } else {
                                type_select.selectedIndex = option_offsets[1];
                            }
                        }
                    } else {
                        for (var i = 0; i < artist_inputs.length; i++) {
                            artist_inputs[i].value = '';
                        }
                    }
                };
                return f;

            case "whatcd_request":
                var f = function(rawData) {
                    var artist_inputs = document.getElementsByName("artists[]"),
                        album_title_input = document.getElementsByName("title")[0],
                        year_input = document.getElementsByName("year")[0],
                        label_input = document.getElementsByName("recordlabel")[0],
                        catalog_input = document.getElementsByName("cataloguenumber")[0],
                        tags_input = document.getElementById("tags"),
                        data = yadg.prepareRawResponse(rawData);

                    if (data.artists != false) {
                        yadg_util.addRemoveArtistBoxes(data.artists_length - artist_inputs.length);

                        artist_inputs = document.getElementsByName("artists[]");

                        for (var i = 0; i < artist_inputs.length; i++) {
                            var artist_input = artist_inputs[i],
                                type_select = artist_input.nextSibling;

                            while (type_select.tagName != 'SELECT') {
                                type_select = type_select.nextSibling;
                            }

                            artist_input.value = data.artist_keys[i];

                            option_offsets = yadg_util.getOptionOffsets(type_select);

                            if (data.artists[data.artist_keys[i]] == "Remixer") {
                                type_select.selectedIndex = option_offsets[3];
                            } else if (data.artists[data.artist_keys[i]] == "Feature") {
                                type_select.selectedIndex = option_offsets[2];
                            } else {
                                type_select.selectedIndex = option_offsets[1];
                            }
                        }
                    } else {
                        for (var i = 0; i < artist_inputs.length; i++) {
                            artist_inputs[i].value = '';
                        }
                    }

                    if (data.tags != false) {
                        tags_input.value = data.tag_string.toLowerCase();
                    } else {
                        tags_input.value = '';
                    }

                    yadg_util.setValueIfSet(data.year,year_input,data.year != false);
                    yadg_util.setValueIfSet(data.title,album_title_input,data.title != false);
                    yadg_util.setValueIfSet(data.label,label_input,data.label != false);
                    yadg_util.setValueIfSet(data.catalog,catalog_input,data.catalog != false);
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
                                if (data.artists[data.artist_keys[i]] == "Main") {
                                    if (artist_string != "" && i < data.artists_length - 1) {
                                        artist_string = artist_string + ", ";
                                    } else if (artist_string != "" && i == data.artists_length - 1) {
                                        artist_string = artist_string + " & ";
                                    }
                                    artist_string = artist_string + data.artist_keys[i];
                                }
                            }

                            artist_input.value = artist_string;
                        }
                    } else {
                        va_checkbox.checked = false;
                        artist_input.value = "";
                    }

                    yadg_util.setValueIfSet(data.year,year_input,data.year != false);
                    yadg_util.setValueIfSet(data.title,album_title_input,data.title != false);

                    if (data.tags != false) {
                        tags_input.value = data.tag_string_nodots.toLowerCase();
                    } else {
                        tags_input.value = '';
                    }

                    yadg_util.exec(function() {formatName()});
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
                                if (data.artists[data.artist_keys[i]] == "Main") {
                                    if (artist_string != "" && i < data.artists_length - 1) {
                                        artist_string = artist_string + ", ";
                                    } else if (artist_string != "" && i == data.artists_length - 1) {
                                        artist_string = artist_string + " & ";
                                    }
                                    artist_string = artist_string + data.artist_keys[i];
                                }
                            }

                            artist_input.value = artist_string;
                        }
                    } else {
                        artist_input.value = "";
                    }

                    yadg_util.setValueIfSet(data.year,year_input,data.year != false);
                    yadg_util.setValueIfSet(data.title,album_title_input,data.title != false);
                };
                return f;

            default:
                // that should actually never happen
                return function(data) {};
        }
    }
};

var yadg = {
    yadgHost : "https://localhost:8000",
    baseURI : "/api/v2/",

    standardError : "Sorry, an error occured. Please try again. If this error persists the user script might need updating.",
    lastStateError : false,

    isSSL : false,
    isBusy : false,

    setSSL : function(isSSL) {
        this.isSSL = isSSL;
    },

    init : function() {
        this.scraperSelect = document.getElementById('yadg_scraper');
        this.formatSelect = document.getElementById('yadg_format');
        this.input = document.getElementById('yadg_input');
        this.responseDiv = document.getElementById('yadg_response');
        this.button = document.getElementById('yadg_submit');
    },

    getBaseURL : function() {
        return this.yadgHost + this.baseURI;
    },

    getScraperList : function(callback) {
        var url = this.getBaseURL() + "scrapers/";

        var request = new requester(url, 'GET', callback);

        request.send();
    },

    getFormatsList : function(callback) {
        var url = this.getBaseURL() + "templates/";

        this.getTemplates(url, [], callback);
    },

    getTemplates : function(url, templates, callback) {
        var request = new requester(url, 'GET', function(data) {
            for (var i = 0; i < data.results.length; i++) {
                templates.push(data.results[i]);
            }
            if (data.next !== null) {
                yadg.getTemplates(data.next, templates, callback);
            } else {
                callback(templates);
            }
        });

        request.send();
    },

    makeRequest : function() {
        if (this.isBusy) return;
        var scraper = this.scraperSelect.options[this.scraperSelect.selectedIndex].value,
            format = this.formatSelect.options[this.formatSelect.selectedIndex].value,
            inputValue = this.input.value,
            url = this.getBaseURL() + 'query/';

        if (inputValue != '') {
            var data = {
                input : inputValue,
                scraper : scraper
            };

            var request = new requester(url, 'POST', function(response) {
                var response_data = JSON.parse(response.responseText);
                yadg.getResult(response_data.result_url, format);
            }, data);
            this.busyStart();
            request.send();
        }
    },

    getResult : function(result_url,format) {
        var request = new requester(result_url, 'GET', function(response) {
            var response = JSON.parse(response.responseText);

            if (response.status == "done") {
                if (response.type == 'release') {
                    factory.getDescriptionBox().value = response.description;

                    if (yadg.lastStateError == true) {
                        yadg.responseDiv.innerHTML = "";
                        yadg.lastStateError = false;
                    }

                    fillFunc = factory.getFormFillFunction();
                    fillFunc(response.raw_data);
                } else if (response.type == 'release_list') {
                    var ul = document.createElement('ul');
                    ul.id = "yadg_release_list";

                    var scraper_results = response.releases;
                    for (scraper in scraper_results) {
                        var release_list = scraper_results[scraper];
                        for (var i = 0; i < release_list.length;i++) {
                            var name = release_list[i]['name'],
                                info = release_list[i]['info'],
                                query_url = release_list[i]['query_url'],
                                release_url = release_list[i]['release_url'];

                            var li = document.createElement('li'),
                                a = document.createElement('a');

                            a.textContent = name;
                            a.setAttribute('data-query-url', query_url);
                            a.href = release_url;

                            a.addEventListener('click',function(e) { e.preventDefault(); yadg.makeRequestByUrl(this.getAttribute('data-query-url'));},false);

                            li.appendChild(a);
                            li.appendChild(document.createElement('br'));
                            li.appendChild(document.createTextNode(info));

                            ul.appendChild(li);
                        }
                    }

                    if (ul.childNodes.length != 0) {
                        yadg.responseDiv.innerHTML = "";
                        yadg.responseDiv.appendChild(ul);
                        yadg.lastStateError = false;
                    } else {
                        yadg.printError('Sorry, there were no matches.');
                    }
                } else if (response.type == 'release_not_found') {
                    yadg.printError('I could not find the release with the given ID. You may want to try again with another one.');
                } else {
                    yadg.printError('Something weird happened. Please try again');
                }
                yadg.busyStop();
            } else if (response.status == 'failed') {
                yadg.failed_callback();
            } else  {
                var delay = function() { yadg.getResult(data.result_url,data.format); };
                window.setTimeout(delay, 1000);
            }
        });
        request.data.result_url = result_url;
        request.data.format = format;
        request.send();
    },

    makeRequestByUrl : function(url) {
        if (this.isBusy) return;
        var format = this.formatSelect.options[this.formatSelect.selectedIndex].value;

        var request = new requester(url, function(response_data,data) {
            yadg.getResult(response_data.result_url,format);
        });
        this.busyStart();
        request.send();
    },

    printError : function(message) {
        this.responseDiv.innerHTML = "";
        this.responseDiv.appendChild(document.createTextNode(message));
        this.lastStateError = true;
    },

    failed_callback : function() {
        yadg.printError(yadg.standardError);
        yadg.busyStop();
    },

    busyStart : function() {
        this.isBusy = true;
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
        this.isBusy = false;
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
                }
            }
        }
        if (rawData.hasOwnProperty('discs')) {
            for (var key in rawData.discs) {
                for (var i in rawData.discs[key]) {
                    var track = rawData.discs[key][i];
                    for (var j in track[1]) {
                        var name = track[1][j]["name"],
                            type = track[1][j]["type"];
                        if ( !(name in result.artists) || (type == "Main" && result.artists[name] != "Main") ) {
                            result.artists[name] = type;
                        }
                    }
                }
            }
        }
        if (rawData.hasOwnProperty('released')) {
            result.year = rawData.released.match(/\d{4}/)[0];
            if (result.year.length != 4) {
                result.year = false;
            }
        }
        if (rawData.hasOwnProperty('title')) {
            result.title = rawData.title;
        }
        if (rawData.hasOwnProperty('label')) {
            result.label = rawData.label[0];
        }
        if (rawData.hasOwnProperty('catalog')) {
            result.catalog = rawData.catalog[0];
        }
        if (rawData.hasOwnProperty('genre')) {
            result.genre = rawData.genre;
        }
        if (rawData.hasOwnProperty('style')) {
            result.style = rawData.style;
        }
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
                }
            }
        }

        if (result.artists != false) {
            // count the artists
            result.artists_length = 0;
            result.artist_keys = [];

            for (var i in result.artists) {
                if (result.artists.hasOwnProperty(i)) {
                    result.artists_length++;
                    result.artist_keys.push(i);
                }
            }
        }

        if (result.artists_length == 0) {
            result.artists = false;
        }

        return result;
    }
};

yadg_sandbox.init(function() {
    factory.init();
    yadg.init();
});