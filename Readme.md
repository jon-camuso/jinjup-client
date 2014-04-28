## The Client Side of jinjup

A JavaScript module that sends asynchronous requests and proceses jinjup formatted response objects.

## Format

Adorn anchor elements with a data-async attribute and a value indicating the HTTP method(verb) and 
jinjup client will wire them for asynchornous calls to your http server.

```html
	 
	<a href="/about" data-async='GET'>about</a>

```

## Include

```html
	 
<script src="/path/jinjup-client.js" type="text/javascript">

```

## Initialize

Use default behavior

	// All requests invoked by clicks on elements having data-async attributes will
	// be routed to jinjup's sendRequest method and from there send to the server.
	//
	jinjup.initialize();

Optionally override default request routing by passing a request route map to 
jinjup's initialize method.

```js

	function makeMyOwnAsynchronousCall()
	{
		// do it
	}

	var routesToMyCode = {};
	routesToMyCode['/Path_To_Special_Resource'] = makeMyOwnAsynchronousCall;


	// jinjup's routRequest method will foraward requests for '/Path_To_Special_Resource'
	// to makeMyOwnAsynchronousCall
	//
	jinjup.initialize(routesToMyCode);

```

Override to perform some pre-request work then use jinjup to send the request.

```js

	function preProcessRequest(requestPath)
	{
		// prepare some name value collection to be posted to server 
		//
		var requestBody = 'name=value';

		// call jinjup's default asynchronous request sender
		//
		self.sendRequest('POST', requestPath, requestBody);
	}

	var routesToMyCode = {};
	routesToMyCode['/Path_That_Requires_Preprocessing'] = function(){preProcessRequest('/Path_That_Requires_Preprocessing');};

	jinjup.initialize(routesToMyCode);

```


Perform custom response processing

```js

	function customProcessResponse()
	{
		if(confirm("Do you want jinjup to process this response?") === true)
		{
			jinjup.defaultProcessResponse();
		}
	}

	var customResponseProcessingRoutes = {};
	customResponseProcessingRoutes['/Path_Requiring_Custom_Postprcessing'] = customProcessResponse;

	jinjup.initialize(null, customResponseProcessingRoutes);

```


## Asynchronous is great but what about the BACK button and HISTORY?

On the client side you're covered.  jinjup Client manages history pushstate and popstate for you.
You are responsible for producing the appropriate response on the server.  If you are using 
[node.js](http://nodejs.org) with [jinjup HTML Controls](https://github.com/jon-camuso/jinjup-html-controls) then producing output for synchronous and 
asynchronous requests for the same view is a breeze.
 
Check out [jinjup HTML Controls](https://github.com/jon-camuso/jinjup-html-controls) and 
the [jinjup Resonse Object](https://github.com/jon-camuso/jinjup-response) to learn more 
about the server side of jinjup! 