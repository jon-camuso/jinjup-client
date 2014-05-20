/*
jinjup-client v0.1.0
jinjup.com 
Copyright (c) 2013-2014 Jon Camuso <jcamuso@exechos.com>
MIT Licensed
*/


var jinjup = (function ()
{

	var xmlHttpReq = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
	var self = null;
	var requestRoutes = {};
	var responseRoutes = {};

	urlDecode = function (encoded)
	{
		return decodeURIComponent((encoded + '').replace(/\+/g, '%20'));
	};

	urlEncode = function (plaintext)
	{
		return encodeURIComponent(plainText);
	};


	return {

		initialize: function (reqRoutes, resRoutes)
		{
			self = this;
			self.loaded = true;
			self.requestRoutes = reqRoutes ? reqRoutes : {};
			self.responseRoutes = resRoutes ? resRoutes : {};

			if (typeof (Event) != "undefined")
			{
				if (!Event.prototype.preventDefault)
				{
					Event.prototype.preventDefault = function ()
					{
						this.returnValue = false;
					};
				}
				if (!Event.prototype.stopPropagation)
				{
					Event.prototype.stopPropagation = function ()
					{
						this.cancelBubble = true;
					};
				}
			}

			self.initializeNavigation();
		},

		mergeSelect: function (target, response)
		{
			var options = target.options;
			for (var index = 0; index < options.length; ++index)
			{
				if ((options[index].value && options[index].value == response.Content)
				|| (options[index].text == response.Content))
				{
					target.selectedIndex = index;
					break;
				}
			}
		},

		createNodeFromContent: function (content)
		{
			var node = null;
			if (content.nodeType === "text")
			{
				node = document.createTextNode(content.nodeValue);
			}
			else if (content.nodeType === "element")
			{
				node = document.createElement(content.tagName);
				for (name in content.attributes)
				{
					node.setAttribute(name, content.attributes[name]);
				}
				var length = content.childNodes.length;
				for (var index = 0; index < length; ++index)
				{
					var child = this.createNodeFromContent(content.childNodes[index]);
					node.appendChild(child);
				}
			}
			return node;
		},

		mergeResponse: function (response)
		{
			var matchingElements;
			var contentIsString = false;
			var path = response.subject.path;
			if (path)
			{
				var content = response.content;

				if (typeof content === 'string')
				{
					contentIsString = true;
					content = urlDecode(content);
				}
				if (response.subject.space === 'console')
				{
					if ((console.hasOwnProperty(path)
					|| path in console)
					&& typeof (console[path]) === 'function')
					{
						console[path](content);
					}
				}
				else if (response.subject.space === 'dom')
				{
					if ((matchingElements = document.querySelectorAll(path)) != null)
					{
						var length = matchingElements.length;

						if (response.subject.type === 'element')
						{
							for (var index = 0; index < length; ++index)
							{
								var matchingElement = matchingElements[index];
								if (!contentIsString)
								{
									var node = this.createNodeFromContent(content);

									switch (response.method)
									{
										case 'post':
											matchingElement.appendChild(node);
											break;
										case 'put':
											matchingElement.parentNode.replaceChild(node, matchingElement);
											break;
										case 'delete':
											matchingElement.parentNode.removeChild(matchingElement);
											break;
										default:
											break;
									};
								}
								else
								{
									if (matchingElement.tagName == "SELECT")
									{
										self.mergeSelect(matchingElement, response);
									}
									else if (response.method === 'post')
									{
										matchingElement.innerHTML = content;
									}
									else if (response.method === 'put')
									{
										var container = document.createElement('div');
										container.innerHTML = content;
										matchingElement.parentNode.replaceChild(container.firstChild, matchingElement);
									}
								}
							}
						}
						else if (response.subject.type === 'attribute')
						{
							for (var index = 0; index < length; ++index)
							{
								var matchingElement = matchingElements[index];
								if (response.method === 'put')
								{
									matchingElement.setAttribute(response.subject.name, content);
								}
								else if (response.method === 'delete')
								{
									matchingElement.removeAttribute(response.subject.name);
								}
							}
						}
					}
					else
					{
						console.error('Response Subject path: ' + path + ' not found.');
					}
				}
			}

			if (responses in response)
			{
				var responses = response.responses;
				var count = responses.length;

				for (var index = 0; index < count; index++)
				{
					self.mergeResponse(responses[index]);
				}
			}

		},

		defaultProcessResponse: function ()
		{
			try
			{
				var response;
				var responseText = xmlHttpReq.responseText;

				if ((response = JSON.parse(responseText)) == null)
				{
					console.error('Failed JSON.parse [' + responseText + ']');
				}
				else
				{
					self.mergeResponse(response);
				}
			}
			catch (exception)
			{
				console.error(' defaultProcessResponse ' + exception);
			}
		},

		sendRequest: function (method, url, body)
		{
			var request = document.createElement('a');
			request.href = url;
			var requestPath = request.pathname;
			if (requestPath[0] !== '/')
			{
				requestPath = '/' + requestPath;
			}

			var asyncUrl = '/async'
						  + requestPath
						  + request.search;

			var callbackFunction = null;
			if (self.responseRoutes[url])
			{
				callbackFunction = self.responseRoutes[url];
			}
			else if (self.requestRoutes[request.pathname])
			{
				callbackFunction = self.responseRoutes[request.pathname];
			}
			else
			{
				callbackFunction = self.defaultProcessResponse;
			}

			xmlHttpReq.open(method, asyncUrl, true);
			xmlHttpReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

			xmlHttpReq.onreadystatechange = function ()
			{
				switch (xmlHttpReq.readyState)
				{
					case 1:
						break;
					case 2:
						break;
					case 3:
						break;
					case 4:
						if (xmlHttpReq.status === 200)
						{
							callbackFunction();
						}
						else
						{
							console.log('Error: server returned status ' + xmlHttpReq.status);
						}
						break;
				}
			}
			xmlHttpReq.send(body);
		},

		routeRequest: function (request)
		{

			if (request.href && self.requestRoutes[request.href])
			{
				self.requestRoutes[request.href]();
			}
			else if (self.requestRoutes[request.pathname])
			{
				self.requestRoutes[request.pathname]();
			}
			else
			{
				self.sendRequest(request.getAttribute('data-async'), request.href);
			}
		},

		asyncNavigate: function (event)
		{
			if (this.href)
			{
				var href = this.href;
				self.routeRequest(this);

				if (history.pushState)
				{
					history.pushState('', 'New URL: ' + href, href);
				}
			}
			event.preventDefault();
		},

		initializeNavigation: function ()
		{
			document.addEventListener('click', function (event)
			{
				var element = event.target;
				var found = false;
				while (element
					&& !(found = (element.tagName == 'A'
					&& element.getAttribute('data-async'))))
				{
					element = element.parentElement;
				}
				if (found)
				{
					self.asyncNavigate.call(element, event);
				}
			});
			window.onpopstate = function (e)
			{
				if (!self.loaded)
				{
					self.loaded = true;
				}
				else if (history.state != null )
				{
					var request = document.createElement('a');
					request.href = url;
					request.setAttribute('data-async', 'GET');
					self.routeRequest(request);
				}
			};
		},

		serializeAllUserElements: function ()
		{
			var serializedInputs = this.serializeInputs();
			if (serializedInputs != "")
			{
				serializedInputs += "&";
			}
			serializedInputs += this.serializeAllSelectElements();
			if (serializedInputs != "")
			{
				serializedInputs += "&";
			}
			serializedInputs += this.serializeTextAreas();
			if (serializedInputs != "")
			{
				serializedInputs += "&";
			}
			return serializedInputs;
		},

		serializeTextAreas: function (parentElement)
		{
			var index = 0;
			var serializedInputs = "";
			var parentElement = (parentElement || document.body);
			var textAreas = parentElement.getElementsByTagName('textarea');
			for (index = 0; index < textAreas.length; index++)
			{
				if (textAreas[index].name != null && textAreas[index].name != "")
				{
					serializedInputs += textAreas[index].name;
					serializedInputs += "=";
					serializedInputs += urlEncode(textAreas[index].value);
				}
			}
			return serializedInputs;
		},

		serializeInputs: function (parentElement)
		{
			var index = 0;
			var serializedInputs = "";
			var inputs = this.getInputChildElements(parentElement);
			for (index = 0; index < inputs.length; index++)
			{
				if (inputs[index].name != null && inputs[index].name != "")
				{
					if ((inputs[index].type == "radio"
						|| inputs[index].type == "checkbox")
						&& !inputs[index].checked)
					{
						continue;
					}
					if (serializedInputs != "")
					{
						serializedInputs += "&";
					}
					serializedInputs += inputs[index].name;
					serializedInputs += "=";
					serializedInputs += urlEncode(inputs[index].value);
				}
			}
			return serializedInputs;
		},

		getInputChildElements: function (specifiedElement)
		{
			var parentElement = (specifiedElement || document.body);
			try
			{
				return parentElement.getElementsByTagName("input");
			}
			catch (exception)
			{
				console.log("getInputChildElements failed with error " + exception);
			}
			return [];
		},

		serializeAllSelectElements: function ()
		{
			var serializedSelects = "";
			var selects = document.getElementsByTagName("select");
			var index = 0;
			for (index = 0; index < selects.length; index++)
			{
				if (index > 0)
				{
					serializedSelects += "&";
				}
				serializedSelects += this.serializeSelectedOptionWithId(selects[index]);
			}
			return serializedSelects;
		},

		serializeSelectedOptionWithId: function (specifiedElement)
		{
			var serializedSelect = specifiedElement.name + "=";
			if (specifiedElement.options[specifiedElement.selectedIndex].value != "")
			{
				serializedSelect += urlEncode(specifiedElement.options[specifiedElement.selectedIndex].value);
			}
			else
			{
				serializedSelect += specifiedElement.options[specifiedElement.selectedIndex].text;
			}
			return serializedSelect;
		},

		serializeAllSelectOptionsWithId: function (specifiedElement)
		{
			var index = 0;
			var serializedSelect = specifiedElement.name + "=";
			var options = specifiedElement.options;
			for (index = 0; index < options.length; index++)
			{
				if (index > 0)
				{
					serializedSelect += ",";
				}
				serializedSelect += urlEncode(options[index].value);
			}
			return serializedSelect;
		},

		validateInputs: function (inputs)
		{
			var areValid = true;
			for (var index = 0; areValid && index < inputs.length; index++)
			{
				areValid = this.validateInput(inputs[index]);
			}
			return areValid;
		},

		validateInput: function (input)
		{
			var isValid = true;
			if (input.value == "")
			{
				isValid = false;
				input.focus();
				console.log("Please enter a " + input.title);
			}
			return isValid;
		},

		getProperty: function (propertyName, element)
		{
			// Note that in some versions of IE9 it is critical that
			// msTransform appear in this list before MozTransform
			var suffixed = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
			var properties = [
		        propertyName,
		        "Webkit" + suffixed,
		        "ms" + suffixed,
		        "Moz" + suffixed,
		        "O" + suffixed
		    ];
			var p;
			while (p = properties.shift())
			{
				if (typeof element.style[p] != 'undefined')
				{
					return p;
				}
			}
			return false;
		},


	};


} ());


jinjup.initialize();	

