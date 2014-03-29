jinjup Client

JavaScript module that sends asynchronous requests and proceses jinjup formatted response objects.

```html
	<!--
		adorn anchor elements with data-asynch and data-verb attributes and jinjup client will wire them 
		for asynchornous calls to your http server.
	-->
	 
	<a href="/about" data-asynch='1' data-verb='GET'>about</a>

```

## Initialization

Optionally use default behavior

	jinjup.initialize();

...override with your own code

```js

	function makeMyOwnAsynchronousCall()
	{
		// do it
	}

	var specialRoutes = {};
	specialRoutes['/Path_To_Special_Resource'] = makeMyOwnAsynchronousCall;

	jinjup.initialize(specialRoutes);

```

...perform custom preprocessing and post processing

	jinjup.initialize(specialPreProcessingRoutes, specialPostProcessingRoutes);


## Asynchronous is great but what about the BACK button and HISTORY?

On the client side you're covered.  jinjup Client manages history pushstate and popstate for you.
You are responsible for producing the appropriate response on the server.  If you are using 
node.js with jinjup html controls producing output for synchronous and asynchronous requests for
the same view is a breeze.
 
Check out [jinjup HTML Controls](https://github.com/jon-camuso/jinjup-html-controls) and 
the [jinjup Resonse Object](https://github.com/jon-camuso/jinjup-response) to learn more 
about the server side of jinjup! 