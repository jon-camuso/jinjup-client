/*
jinjup-client v0.0.3 
jinjup.com 
Copyright (c) 2013-2014 Jon Camuso <jcamuso@exechos.com>
Lisence MIT
*/


var jinjup = (function () {
	
	var xmlHttpReq =  window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
	var self = null;
	var requestRoutes = {};
	var responseRoutes = {};
	
		urlDecode = function (encoded)
		{
			return decodeURIComponent((encoded+'').replace(/\+/g, '%20'));
		};
		
		urlEncode = function (plaintext)
		{
			return encodeURIComponent(plainText);
		};

		
	return {
	
		initialize: function(reqRoutes, resRoutes)
		{
			self = this;			
			self.requestRoutes = reqRoutes ? reqRoutes : {};
			self.responseRoutes = resRoutes ? resRoutes : {};
			
			if(typeof(Event) != "undefined")
			{
				if (!Event.prototype.preventDefault) 
				{
					Event.prototype.preventDefault=function() 
					{
						this.returnValue=false;
					};
				}
				if (!Event.prototype.stopPropagation) 
				{
					Event.prototype.stopPropagation=function() 
					{
						this.cancelBubble=true;
					};
				}
			}

			self.initializeNavigation();			
		},

		mergeSelect: function(target, response)
		{
			var options = target.options;
			for(var index = 0; index < options.length; ++index)
			{
				if((options[index].value && options[index].value == response.Content)
				|| (options[index].text == response.Content))
				{
					target.selectedIndex = index;
					break;
				}
			}
		},

		createNodeFromContent: function(content)
		{
			var node = null;	
			if(content.nodeType === "text")
			{
				node = document.createTextNode(content.nodeValue);
			}
			else if(content.nodeType === "element")
			{
				node = document.createElement(content.tagName);
				for(name in content.attributes)
				{
					node.setAttribute(name, content.attributes[name]);
				}
				var length = content.childNodes.length;
				for(var index = 0; index < length; ++index)
				{
					var child = this.createNodeFromContent(content.childNodes[index]);
					node.appendChild(child);
				}
			}
			return node; 
		},

		mergeResponse: function(response)
		{
			var domElement;
			var isStringContent = false;
			var targetId = response.targetId;
			if(targetId)
			{
				var content = response.content;

				if(typeof content === "string")
				{
					isStringContent = true;
					content = urlDecode(content);
				}
				if(targetId === 'alert' && isStringContent)
				{
					alert(content);
				}
				if(response.targetType === 'console' && isStringContent)
				{
					if((console.hasOwnProperty(targetId)
					|| targetId in console)
					&& typeof(console[targetId]) === 'function' )
					{
						console[targetId](content);
					}
				}
				else if((domElement = document.getElementById(targetId)) != null)
				{
					if(response.targetType == 'element')
					{
						if(!isStringContent)
						{
							var node = this.createNodeFromContent(content);
							if(targetId === response.id)
							{
								domElement.parentNode.replaceChild(node, domElement);
							}
							else
							{
								domElement.innerHTML = "";
								domElement.appendChild(node);
							}
						}
						else
						{
							if(domElement.tagName == "INPUT")
							{
								domElement.value = content;
							}
							else if(domElement.tagName == "SELECT")
							{
								self.mergeSelect(domElement, response);
							}
							else if(targetId === response.id)
							{
								var container = document.createElement('div');
								container.innerHTML = content;
								domElement.parentNode.replaceChild(container.firstChild, domElement);
							}
							else
							{
								domElement.innerHTML = content;
							}
						}
					}
				}
				else 
				{
					console.error('Dom Target: '+ targetId + ' not found.');
				}
			}

			if(response.childViews)
			{
				var childViews = response.childViews;
				var count = response.childViews.length;
			
				for(var index = 0; index < count; index++)
				{
					self.mergeResponse(childViews[index]);
				}
			}
			
		},
		
		defaultProcessResponse: function ()
		{
			try
			{
				var response;
				var responseText = xmlHttpReq.responseText;
				
				if((response = JSON.parse(responseText)) == null)
				{
					console.error('JSON failed to parse [' + responseText + ']');
				}
				else
				{
					self.mergeResponse(response);
				}
			}
			catch(exception)
			{
				console.error( ' defaultProcessResponse ' + exception);
			}
		},
		
		sendRequest: function(method, url, body)
		{
			var request = document.createElement('a');
			request.href = url;
			var requestPath = request.pathname;
			if(requestPath[0] !== '/')
			{
				requestPath = '/' + requestPath;
			}

			var asyncUrl = '/async'
						  + requestPath
						  + request.search;

			var callbackFunction = null;
			if(self.responseRoutes[url])
			{
				callbackFunction = self.responseRoutes[url];
			}
			else if (self.responseRoutes[request.pathname])
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
							console.log('Error: server returned status '+ xmlHttpReq.status );
						}
						break;
				}
			}
			xmlHttpReq.send(body);
		},

		routeRequest: function(request)
		{
			
			if(request.href && self.requestRoutes[request.href])
			{
				self.requestRoutes[request.href]();
			}
			else if(self.requestRoutes[request.pathname])
			{
				self.requestRoutes[request.pathname]();
			}
			else
			{
				self.sendRequest(request.getAttribute('data-async'), request.href);
			}									
		},

		asyncNavigate: function(event)
		{
			if(this.href)
			{
				var href = this.href;
				self.routeRequest(this);
		
				if(history.pushState)
				{
					history.pushState('', 'New URL: ' + href, href);
				}
			}
			event.preventDefault();			
		},
		
		initializeNavigation: function()
		{
			document.addEventListener('click',  function(event){
					var element = event.target;
					var found = false;
					while(element 
					&& 	!(found = (element.tagName == 'A' 
					&& element.getAttribute('data-async'))))
					{
						element = element.parentElement;
					}
					if(found)
					{
						self.asyncNavigate.call(element, event);
					}
			});
			window.onpopstate = function (e)
			{
				if(!self.loaded)
				{
					self.loaded = true;
				}
				else if(history.state != null)
				{
					site.getView(location.href);
				}
			};
		},
		
		serializeAllUserElements: function ()
		{
			var serializedInputs = this.serializeInputsWithIds();
			if(serializedInputs != "")
			{
				serializedInputs += "&";
			}
			serializedInputs += this.serializeAllSelectElements();
			if(serializedInputs != "")
			{
				serializedInputs += "&";
			}
			serializedInputs += this.serializeTextAreasWithIds();
			if(serializedInputs != "")
			{
				serializedInputs += "&";
			}
			return serializedInputs;
		},
		
		serializeTextAreasWithIds: function (parentElement)
		{
			var index = 0;
			var serializedInputs = "";
			var parentElement = (parentElement || document.body);
			var textAreas = parentElement.getElementsByTagName('textarea');
			for(index = 0; index < textAreas.length; index++)
			{
				if(textAreas[index].id != null && textAreas[index].id != "")
				{
					serializedInputs += textAreas[index].id;
					serializedInputs += "=";
					serializedInputs += urlEncode (textAreas[index].value);
				}
			}
			return serializedInputs;
		},
		
		serializeInputsWithIds: function (parentElement)
		{
			var index = 0;
			var serializedInputs = "";
			var inputs = this.getInputChildElements(parentElement);
			for(index = 0; index < inputs.length; index++)
			{
				if(inputs[index].id != null && inputs[index].id != "")
				{
					if((inputs[index].type == "radio"
						|| inputs[index].type == "checkbox")
						&& !inputs[index].checked)
					{
						continue;
					}
					if(serializedInputs != "")
					{
						serializedInputs += "&";
					}
					serializedInputs += inputs[index].id;
					serializedInputs += "=";
					serializedInputs += urlEncode (inputs[index].value);
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
			catch(exception)
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
			for(index = 0; index < selects.length; index++)
			{
				if(index > 0)
				{
					serializedSelects += "&";
				}
				serializedSelects += this.serializeSelectedOptionWithId(selects[index]);
			}
			return serializedSelects;
		},
		
		serializeSelectedOptionWithId: function (specifiedElement)
		{
			var serializedSelect = specifiedElement.id + "=";
			if(specifiedElement.options[specifiedElement.selectedIndex].value != "")
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
			var serializedSelect = specifiedElement.id + "=";
			var options = specifiedElement.options;
			for(index = 0; index < options.length; index++)
			{
				if(index > 0)
				{
					serializedSelect += ",";
				}
				serializedSelect += urlEncode (options[index].value);
			}
			return serializedSelect;
		},
		
		validateInputs: function(inputs)
		{
			var areValid = true;
			for(var index = 0; areValid && index < inputs.length; index++)
			{
				areValid = this.validateInput(inputs[index]);
			}
			return areValid ;
		},
		
		validateInput: function(input)
		{
			var isValid = true;
			if(input.value == "")
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
			while(p = properties.shift())
			{
				if(typeof element.style[p] != 'undefined')
				{
					return p;
				}
			}
			return false;
		},
						
		setOpacity: function (element, opacity)
		{
			var property = null;
			if(opacity < 0)
			{
				opacity = 0;
			}
			if((property = element.style.filter))
			{
				property = "alpha(opacity=" + opacity + ")";
			}
			else if((property = this.getProperty("opacity", element)))
			{
				element.style[property] = opacity;
			}
		},
		
		getOpacity: function (element)
		{
			var property = null;
			var opacity = 0;
			if((property = element.style.filter))
			{
				opacity = parseFloat(property.replace("alpha(opacity=", ""));
			}
			else if((property = this.getProperty("opacity", element)))
			{
				opacity = element.style[property] == "" ? 1 : parseFloat(element.style[property]);
			}
			return opacity;
		},
		
		getDocHeight: function()
		{
			var D = document;
			return Math.max(
				Math.max(D.body.scrollHeight, D.documentElement.scrollHeight),
				Math.max(D.body.offsetHeight, D.documentElement.offsetHeight),
				Math.max(D.body.clientHeight, D.documentElement.clientHeight));
		}				
					
	};
	
	
}());


jinjup.initialize();	

