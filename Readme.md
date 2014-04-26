## The Client Side of jinjup

A JavaScript module that sends asynchronous requests and proceses jinjup formatted response objects.

## Format

Adorn anchor elements with a data-asynch attribute and a value indicating the HTTP method(verb) and 
jinjup client will wire them for asynchornous calls to your http server.

```html
	 
	<a href="/about" data-asynch='GET'>about</a>

```

## Include

```html
	 
<script src="/path/jinjup-client.js" type="text/javascript">

```

## Initialize

Use default behavior

	jinjup.initialize();

Override with your own code

```js

	function makeMyOwnAsynchronousCall()
	{
		// do it
	}

	var specialRoutes = {};
	specialRoutes['/Path_To_Special_Resource'] = makeMyOwnAsynchronousCall;

	jinjup.initialize(specialRoutes);

```

Perform custom preprocessing and post processing

	jinjup.initialize(specialPreProcessingRoutes, specialPostProcessingRoutes);


## Asynchronous is great but what about the BACK button and HISTORY?

On the client side you're covered.  jinjup Client manages history pushstate and popstate for you.
You are responsible for producing the appropriate response on the server.  If you are using 
[node.js](http://nodejs.org) with [jinjup HTML Controls](https://github.com/jon-camuso/jinjup-html-controls) then producing output for synchronous and 
asynchronous requests for the same view is a breeze.
 
Check out [jinjup HTML Controls](https://github.com/jon-camuso/jinjup-html-controls) and 
the [jinjup Resonse Object](https://github.com/jon-camuso/jinjup-response) to learn more 
about the server side of jinjup! 