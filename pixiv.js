// ************************************** 
//  ContentScript of chrome extension  
// **************************************

var MAX_ALLOWED = 15;
var QUERY_END_FLAG = false;
var pixiv_page_number = 0;
var THRESHOLD;
var MAX_INPUT_VALUE = 1000;
var MIN_INPUT_VALUE = 1;

var myPanel = {
	init: function () {
		console.log("Create inputbox box ...");

		//var newDiv = document.createElement("div");
		//document.body.insertBefore(newDiv, document.body.firstChild);

		var tmpFrag = document.createDocumentFragment();

		var label = document.createTextNode(" Number of ★: ");
		var inputbox = document.createElement("input");
		var go_btn = document.createElement("input");

		inputbox.value = 1;
		inputbox.min = MIN_INPUT_VALUE;
		inputbox.max = MAX_INPUT_VALUE;

		go_btn.type = "button";
		go_btn.value = "<< Run Query >>";
		go_btn.onclick = startFiltering;

		console.log("Append elements to docfrag");
		tmpFrag.appendChild(label);
		tmpFrag.appendChild(inputbox);
		tmpFrag.appendChild(go_btn);

		this.inputbox = inputbox;
		this.go_btn = go_btn;
		this.next_btn = null;

		console.log("Add to top of the page");
		var headerDiv = document.getElementsByClassName("layout-wrapper")[0];
		headerDiv.firstChild.appendChild(tmpFrag);
		
		this.cleanAds();
	},
	setButtonText: function (msg) {
		this.go_btn.value = msg;
		this.next_btn.value = msg;
	},
	setDisabledFlag: function (flag) {
		// flag: boolean value
		this.go_btn.disabled = flag;
		this.next_btn.disabled = flag;
		this.inputbox.disabled = flag;
	},
	cleanAds: function () {

		console.log("... Remove Ads ....");

		var navi_nodes = document.body.getElementsByClassName('column-order-menu');
		var top_navi = navi_nodes[0];
		var bot_navi = navi_nodes[1];

		// remove top navigation bar
		top_navi.parentNode.removeChild(top_navi);

		// remove botom navigation bar and add "nextpage" button
		var div = bot_navi.getElementsByClassName("pager-container")[0];
		div.innerHTML = "";

		var next_btn = document.createElement("input");
		next_btn.type = "button";
		next_btn.value = " Run Query ";
		next_btn.onclick = startFiltering;
		div.appendChild(next_btn);
		this.next_btn = next_btn;
		
		// remove all Ads with the matching classes
		function remove_ad_by_className (className, i, list) {
			var node_list = document.getElementsByClassName(className);
			while(node_list[0]) {
				node_list[0].remove();
				console.log('... removed ' + 'className ...');
			}
		}

		var ad_classes = ['aside', 'footer', 'ad-footer', 'ads_area_no_margin', 'popular-introduction', 'ads_inner', 'ad', 'multi-ads-area'];
		ad_classes.forEach(remove_ad_by_className);
		
	}
};



function startFiltering () {

	// Sanity check of user input value
	var user_input = myPanel.inputbox.value;
	if (isNaN(user_input)) {
		user_input = 0;
	} else if (Math.round(user_input) > MAX_INPUT_VALUE) {
		user_input = MAX_INPUT_VALUE;
	} else if (Math.round(user_input) < MIN_INPUT_VALUE) {
		user_input = MIN_INPUT_VALUE;
	} else {
		user_input = Math.round(user_input);
	}

	myPanel.inputbox.value = user_input;

	document.body.scrollTop = document.documentElement.scrollTop = 0;
	myPanel.setButtonText("Processing...");
	myPanel.setDisabledFlag(true);

	// Let the rendering thread catchup and draw the text 
	// before executing the XMLHTTPRequests
	setTimeout(function () {
		THRESHOLD = Number(myPanel.inputbox.value);
		produceNewPage();
	}, 20);
}


function produceNewPage () {
	console.log(THRESHOLD);
	pixiv_page_number = preparePage(pixiv_page_number);
}

function preparePage (requested_pagenum) {
	console.log("in preparePage()");
	myPanel.go_btn.value = "requesting ....images....";
	// var frag = document.createDocumentFragment();


	var container = document.getElementsByClassName("image-items")[0];
	container.innerHTML = "";
	console.log(container.childNodes.length);

	while (container.childNodes.length < MAX_ALLOWED && QUERY_END_FLAG === false) {
		requested_pagenum = getPixivPage(requested_pagenum+1, THRESHOLD, container);
		console.log("container size :" + container.childNodes.length);
	}

	if (QUERY_END_FLAG === true) {
		myPanel.setDisabledFlag(true);
		myPanel.setButtonText("----end of query---");
		
	} else {
		myPanel.setDisabledFlag(false);
		myPanel.setButtonText(" Next Page >>>>>>>>> ");
	}
	return requested_pagenum;
}


function getPixivPage (pixiv_page_number, thresh, container) {
	var newurl = document.URL + "&p=" + pixiv_page_number;
	console.log("requesting page # " + pixiv_page_number);

	var req = new XMLHttpRequest();
	req.open("GET", newurl , false); // synchronous funciton call
	req.send(null);

	console.log(req.statusText);

	var newDoc = document.implementation.createHTMLDocument("temp_document");
	var newDiv = newDoc.createElement('div');
	newDiv.innerHTML = req.responseText;
	newDoc.body.appendChild(newDiv);

	items = newDoc.getElementsByClassName('image-item');
	console.log("got " + items.length + "item");

	if(items.length === 0) {
		QUERY_END_FLAG = true;
	}

	for (var i = 0; i < items.length; i++) {
		if (items[i].childNodes.length === 3) {
			// if the image has been bookmarked by some users
			var num = Number(items[i].childNodes[2].firstChild.firstChild.textContent);
			if (num >= thresh) {
				container.appendChild(items[i]);
			}
		}
	}
	return pixiv_page_number;
}

myPanel.init();

