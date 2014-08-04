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

	urlEncode = function (plainText)
	{
		var encoded = null;
		try
		{
			encoded = encodeURIComponent(plainText);
		}
		catch(exception)
		{
			console.error(exception);
		}
		return encoded;
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

		addRequestRoute: function(path, method, routeFunction)
		{
			var methodFunction = {}; 
			methodFunction[method] = routeFunction;
			self.requestRoutes[path] = methodFunction
			return self.requestRoutes[path];
		},

		addResponseRoute: function(path, method, routeFunction)
		{
			var methodFunction = {}; 
			methodFunction[method] = routeFunction;
			self.responseRoutes[path] = methodFunction
			return self.responseRoutes[path];
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
									switch (response.method)
									{
										case 'post':
											matchingElement.appendChild(this.createNodeFromContent(content));
											break;
										case 'put':
											matchingElement.parentNode.replaceChild(this.createNodeFromContent(content), matchingElement);
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
							var attributeName = response.subject.name;
							var subPath = response.subject.subPath;
							for (var index = 0; index < length; ++index)
							{
								var matchingElement = matchingElements[index];
								if (response.method === 'post')
								{
									var attributeValue = matchingElement.getAttribute(attributeName);
									if(attributeName == "class")
									{
										attributeValue += " ";
									}
									attributeValue += content;
									matchingElement.setAttribute(attributeName, attributeValue);
								}
								else if (response.method === 'put')
								{
									if(subPath)
									{
										var attributeValue = matchingElement.getAttribute(attributeName);
										attributeValue = attributeValue.replace(subPath, content);
										matchingElement.setAttribute(attributeName, attributeValue);
									}
									else
									{
										matchingElement.setAttribute(attributeName, content);
									}
								}
								else if (response.method === 'delete')
								{
									if(subPath)
									{
										var attributeValue = matchingElement.getAttribute(attributeName);
										attributeValue = attributeValue.replace(subPath, "").replace("  ", "").trim();
										matchingElement.setAttribute(attributeName, attributeValue);
									}
									else
									{
										matchingElement.removeAttribute(attributeName);
									}
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

			if (response.responses)
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

			request = self.createRequestFromElement(request);
			request.method = method;

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
							var route = null;
							if((route = self.findResponseRoute(request)))
							{
								route(request);
							}
							else
							{
								self.defaultProcessResponse();
							}
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

		findRequestRoute: function(request)
		{
			return self.findRoute(request, self.requestRoutes);
		},

		findResponseRoute: function(request)
		{
			return self.findRoute(request, self.responseRoutes);
		},

		findRoute: function(request, routes)
		{
			var route = null;
			if (((route = routes[request.path]) && (route = route[request.method]))
			||  ((route = routes[request.pathname]) && (route = route[request.method])))
			{
				return route;
			}
/*
			else if ((route = routes[request.pathname]) && (route = route[request.method]))
			{
				return route;
			}
*/			else
			{
				var paths = Object.keys(routes);
				var wildCards = [];
				var index = 0;
				for(index = 0; index < paths.length; index++)
				{
					if(paths[index].indexOf("*") != -1)
					{
						wildCards.push(paths[index]);
					}
				}
				for(index = 0; index < wildCards.length; index++)
				{
					wildCard = wildCards[index].replace("*", "");
					if ((request.path.indexOf(wildCard) === 0)
					||  (request.pathname.indexOf(wildCard) === 0))
					{
						if((route = routes[wildCards[index]]) && (route = route[request.method]))
						{
							return route;
						}
					}
/*
					else if(request.pathname.indexOf(wildCard) === 0)
					{
						if((route = self.requestRoutes[wildCards[index]]) && (route = route[request.method]))
						{
							return route;
						}
					}
*/
				}
			}

			return null;
		},

		routeRequest: function (request)
		{
			var route = null;
			if((route = self.findRequestRoute(request)))
			{
				route(request);
			}
			else
			{
				self.sendRequest(request.method, request.path);
			}
		},

		createRequestFromElement: function(element)
		{
			var request = {method: element.getAttribute('data-async')};
			if(element.href)
			{
				request.path = element.href;
				request.pathname = element.pathname;
			}
			else if('data-path' in element)
			{
				request.path = element.getAttribute('data-path');
				request.pathname = '';
			}
			return request;
		},

		asyncNavigate: function (event)
		{
			var request = self.createRequestFromElement(this);
			request.event = event;
			self.routeRequest(request);

			if (request.method === 'GET' && history.pushState)
			{
				history.pushState('', 'New URL: ' + request.path, request.path);
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
					&& !(found = (element.getAttribute('data-async'))))
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

