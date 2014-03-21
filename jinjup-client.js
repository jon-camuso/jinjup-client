/*
jinjup-client v0.0.3 
jinjup.com 
Copyright (c) 2013-2014 Jon Camuso <jcamuso@exechos.com>
License MIT
*/


var jinjup = (function () {
	
	var xmlHttpReq =  window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
	var self = null;
	this.site = null;
	
		urlDecode = function (encoded)
		{
			// Replace + with ' '
			// Replace %xx with equivalent character
			// Put [ERROR] in output if %xx is invalid.
			var HEXCHARS = "0123456789ABCDEFabcdef";
			var plaintext = "";
			var i = 0;
			while(i < encoded.length)
			{
				var ch = encoded.charAt(i);
				if(ch == "+")
				{
					plaintext += " ";
					i++;
				}
				else if(ch == "%")
				{
					if(i < (encoded.length - 2)
						&& HEXCHARS.indexOf(encoded.charAt(i + 1)) != -1
						&& HEXCHARS.indexOf(encoded.charAt(i + 2)) != -1)
					{
						plaintext += unescape(encoded.substr(i, 3));
						i += 3;
					}
					else
					{
						conslole.log('Bad escape combination near ...' + encoded.substr(i));
						plaintext += "%[ERROR]";
						i++;
					}
				}
				else
				{
					plaintext += ch;
					i++;
				}
			}
			return plaintext;
		};
		
		urlEncode = function (plaintext)
		{
			var SAFECHARS = "0123456789" + // Numeric
				"ABCDEFGHIJKLMNOPQRSTUVWXYZ" + // Alphabetic
				"abcdefghijklmnopqrstuvwxyz" +
				"-_.!~*'()"; // RFC2396 Mark characters
			var HEX = "0123456789ABCDEF";
			var encoded = "";
			for(var i = 0; i < plaintext.length; i++)
			{
				var ch = plaintext.charAt(i);
				if(ch == " ")
				{
					encoded += "+"; // x-www-urlencoded, rather than %20
				}
				else if(SAFECHARS.indexOf(ch) != -1)
				{
					encoded += ch;
				}
				else
				{
					var charCode = ch.charCodeAt(0);
					if(charCode > 255)
					{
						console.log("Unicode Character '"
							+ ch
							+ "' cannot be encoded using standard URL encoding.\n" +
							"(URL encoding only supports 8-bit characters.)\n" +
							"A space (+) will be substituted.");
						encoded += "+";
					}
					else
					{
						encoded += "%";
						encoded += HEX.charAt((charCode >> 4) & 0xF);
						encoded += HEX.charAt(charCode & 0xF);
					}
				}
			}
			return encoded;
		};

		
	return {
	
		initialize: function(site)
		{
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

			self = this;			
			self.site = site;			
			self.initializeNavigation();			
			self.site.initialize();
		},
		mergeSelect: function(target, responseView)
		{
			var options = target.options;
			for(var index = 0; index < options.length; ++index)
			{
				if((options[index].value && options[index].value == responseView.Content)
				|| (options[index].text == responseView.Content))
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

		mergeResponseView: function(responseView)
		{
			var domElement;
			var isStringContent = false;
			var targetId = responseView.targetId;
			if(targetId)
			{
				var content = responseView.content;

				if(typeof content === "string")
				{
					isStringContent = true;
					content = urlDecode(content);
				}
				if(targetId === "alert" && isStringContent)
				{
					alert(content);
				}
				if(responseView.targetType === "console" && isStringContent)
				{
					if(console.hasOwnProperty(targetId)
					&& typeof(console[targetId]) === 'function' )
					{
						console[targetId](content);
					}
				}
				else if((domElement = document.getElementById(targetId)) != null)
				{
					if(!isStringContent)
					{
						var node = this.createNodeFromContent(content);
						if(targetId === responseView.id)
						{
							domElement.parentNode.replaceChild(node, domElement);
						}
						else
						{
							domElement.innerHTML = "";
							domElement.appendChild(node);
						}
					}
/*
					else
					{
						if(domElement.tagName == "INPUT")
						{
							domElement.value = content;
						}
						else if(domElement.tagName == "SELECT")
						{
							self.mergeSelect(domElement, responseView);
						}
						else
						{
							domElement.innerHTML = content;
						}
					}
*/
				}
				else 
				{
					console.error('Dom Target: '+ targetId + ' not found.');
				}
			}
			if(responseView.childViews)
			{
				var childViews = responseView.childViews;
				var count = responseView.childViews.length;
			
				for(var index = 0; index < count; index++)
				{
					self.mergeResponseView(childViews[index]);
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
					console.log('JSON failed to parse [' + responseText + ']');
				}
				else
				{
					self.mergeResponseView(response);
				}
			}
			catch(exception)
			{
				console.log( ' defaultProcessResponse ' + exception);
			}
		},
		
		postRequest: function(event, view, action, callbackFunction)
		{
			var qString = view;

			if(!callbackFunction)
			{
				callbackFunction = self.defaultProcessResponse;
			}

			
			xmlHttpReq.open('POST', qString, true);
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
			xmlHttpReq.send(action);
		},

		hasClass: function(element, className)
		{
			
		},

		asynchNavigate: function(event)
		{
			if(this.href)
			{
				var href = this.href;
				self.site.getView(href);
		
				if(history.pushState)
				{
					history.pushState('', 'New URL: ' + href, href);
				}
			}
			event.preventDefault();			
		},
		
		initializeNavigation: function()
		{
			document.addEventListener("click",  function(event){
					var element = event.target;
					var found = false;
					while(element 
					&& 	!(found = (element.tagName == 'A' && element.classList.contains("nav-a"))))
					{
						element = element.parentElement;
					}
					if(found)
					{
						self.asynchNavigate.call(element, event);
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

var site = (function ($, x)
{
	var self = null;
	var home = window.location.protocol + "//" + window.location.hostname + "/";

	return {

		// Perform some client side initialization of your website
		//
		initialize: function ()
		{
			self = this;
			$(window).resize(function (e) { self.setAllViewPortClasses(); });
			document.addEventListener("touchmove", self.setAllViewPortClasses, false);
			document.addEventListener("scroll", self.setAllViewPortClasses, false);

		},


		// Create and run some feature show
		//
		runFeatureShow: function ()
		{
		},

		loadHome: function ()
		{
			x.defaultProcessResponse();
			x.site.initialize();
			x.site.runFeatureShow();
		},

		// User invoked navigation to "anchored" section located somewhere
		// in the AJAX response view.  Move the browser's view port to that location.
		//
		moveToAnchorResponse: function()
		{
			x.defaultProcessResponse();

			var hash = window.location.hash;
			if(hash && hash.length > 1)
			{
				hash = hash.substr(1, hash.length);
				window.location.hash = "";
				window.location.hash = hash;				
			}

		},
		
		getView: function (href)
		{
			var callBack = null;
			var body = null;
			if (href == home)
			{
				callBack = this.loadHome;
			}
			else if (href.indexOf("/page-with-anchor") != -1)
			{
				callBack = this.moveToAnchorResponse;
			}

			x.postRequest(null, href, body, callBack);
		},

		setViewPortClass: function(element, verticalScrollPosition, inViewClass, outViewClass)
		{
			var top = element.offset().top;
			var offset = Math.min($(element)[0].offsetHeight, 100);


			if (parseInt(verticalScrollPosition) > (top + (offset/2)))
			{
				if(element[0].className.indexOf(outViewClass) === -1)
				{
					element.removeClass(inViewClass).addClass(outViewClass);
				}
			} 
			else
			{
				if(element[0].className.indexOf(inViewClass) === -1)
				{
					element.addClass(inViewClass).removeClass(outViewClass);
				}
			}
		},

		setAllViewPortClasses: function()
		{
			//var watchElements = $(".scroll-watch");
			var scrollTop = parseInt($(window).scrollTop())
			var scrollBottom = (scrollTop  +  parseInt($(window).height()));
/*
			for (var i = 0; i < watchElements.length; i++)
			{
				self.setViewPortClass(watchElements[i], scrollBottom);
			}
*/

			//self.setHeaderViewPortClass(scrollTop);
		},
		
		setHeaderViewPortClass: function(scrollTop)
		{
			var header = $(".main-header");

			if(scrollTop > 85
			&& header[0].className.indexOf("header-floating"))
			{
				header.addClass("header-fixed").removeClass("header-floating");
			}
			else if(scrollTop < 86
				 && header[0].className.indexOf("header-fixed"))
			{
				header.removeClass("header-fixed").addClass("header-floating");
			}
		}
		

	};

} (jQuery, jinjup));


$(function ()
{
	jinjup.initialize(site);	

});

