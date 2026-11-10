/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (function() { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./worker/index.js":
/*!*************************!*\
  !*** ./worker/index.js ***!
  \*************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("// Escuta o evento de Push\nself.addEventListener(\"push\", function(event) {\n    if (event.data) {\n        var _data_data;\n        let data = {\n            title: \"DevLife\",\n            body: \"Nova notifica\\xe7\\xe3o\"\n        };\n        // Tenta ler como JSON (quando vem da sua API)\n        try {\n            data = event.data.json();\n        } catch (e) {\n            // Se não for JSON (como o teste do DevTools), usa texto puro\n            data.body = event.data.text();\n        }\n        const options = {\n            body: data.body,\n            icon: \"/icons/icon-192x192.png\",\n            badge: \"/icons/icon-192x192.png\",\n            vibrate: [\n                100,\n                50,\n                100\n            ],\n            data: {\n                url: ((_data_data = data.data) === null || _data_data === void 0 ? void 0 : _data_data.url) || \"/\"\n            }\n        };\n        event.waitUntil(self.registration.showNotification(data.title, options));\n    }\n});\n// Escuta o clique na notificação\nself.addEventListener(\"notificationclick\", function(event) {\n    event.notification.close();\n    // Abre a URL definida ou a raiz\n    event.waitUntil(clients.openWindow(event.notification.data.url));\n});\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                /* unsupported import.meta.webpackHot */ undefined.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi93b3JrZXIvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQUEsMEJBQTBCO0FBQzFCQSxLQUFLQyxnQkFBZ0IsQ0FBQyxRQUFRLFNBQVVDLEtBQUs7SUFDM0MsSUFBSUEsTUFBTUMsSUFBSSxFQUFFO1lBZ0JDQTtRQWZmLElBQUlBLE9BQU87WUFBRUMsT0FBTztZQUFXQyxNQUFNO1FBQW1CO1FBRXhELDhDQUE4QztRQUM5QyxJQUFJO1lBQ0ZGLE9BQU9ELE1BQU1DLElBQUksQ0FBQ0csSUFBSTtRQUN4QixFQUFFLE9BQU9DLEdBQUc7WUFDViw2REFBNkQ7WUFDN0RKLEtBQUtFLElBQUksR0FBR0gsTUFBTUMsSUFBSSxDQUFDSyxJQUFJO1FBQzdCO1FBRUEsTUFBTUMsVUFBVTtZQUNkSixNQUFNRixLQUFLRSxJQUFJO1lBQ2ZLLE1BQU07WUFDTkMsT0FBTztZQUNQQyxTQUFTO2dCQUFDO2dCQUFLO2dCQUFJO2FBQUk7WUFDdkJULE1BQU07Z0JBQUVVLEtBQUtWLEVBQUFBLGFBQUFBLEtBQUtBLElBQUksY0FBVEEsaUNBQUFBLFdBQVdVLEdBQUcsS0FBSTtZQUFJO1FBQ3JDO1FBRUFYLE1BQU1ZLFNBQVMsQ0FDYmQsS0FBS2UsWUFBWSxDQUFDQyxnQkFBZ0IsQ0FBQ2IsS0FBS0MsS0FBSyxFQUFFSztJQUVuRDtBQUNGO0FBRUEsaUNBQWlDO0FBQ2pDVCxLQUFLQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsU0FBVUMsS0FBSztJQUN4REEsTUFBTWUsWUFBWSxDQUFDQyxLQUFLO0lBQ3hCLGdDQUFnQztJQUNoQ2hCLE1BQU1ZLFNBQVMsQ0FDYkssUUFBUUMsVUFBVSxDQUFDbEIsTUFBTWUsWUFBWSxDQUFDZCxJQUFJLENBQUNVLEdBQUc7QUFFbEQiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vd29ya2VyL2luZGV4LmpzPzgwNWUiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gRXNjdXRhIG8gZXZlbnRvIGRlIFB1c2hcclxuc2VsZi5hZGRFdmVudExpc3RlbmVyKCdwdXNoJywgZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgaWYgKGV2ZW50LmRhdGEpIHtcclxuICAgIGxldCBkYXRhID0geyB0aXRsZTogJ0RldkxpZmUnLCBib2R5OiAnTm92YSBub3RpZmljYcOnw6NvJyB9O1xyXG4gICAgXHJcbiAgICAvLyBUZW50YSBsZXIgY29tbyBKU09OIChxdWFuZG8gdmVtIGRhIHN1YSBBUEkpXHJcbiAgICB0cnkge1xyXG4gICAgICBkYXRhID0gZXZlbnQuZGF0YS5qc29uKCk7XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgIC8vIFNlIG7Do28gZm9yIEpTT04gKGNvbW8gbyB0ZXN0ZSBkbyBEZXZUb29scyksIHVzYSB0ZXh0byBwdXJvXHJcbiAgICAgIGRhdGEuYm9keSA9IGV2ZW50LmRhdGEudGV4dCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG9wdGlvbnMgPSB7XHJcbiAgICAgIGJvZHk6IGRhdGEuYm9keSxcclxuICAgICAgaWNvbjogJy9pY29ucy9pY29uLTE5MngxOTIucG5nJywgLy8gUHV4YSBvIMOtY29uZSBkbyBzZXUgUFdBXHJcbiAgICAgIGJhZGdlOiAnL2ljb25zL2ljb24tMTkyeDE5Mi5wbmcnLFxyXG4gICAgICB2aWJyYXRlOiBbMTAwLCA1MCwgMTAwXSxcclxuICAgICAgZGF0YTogeyB1cmw6IGRhdGEuZGF0YT8udXJsIHx8ICcvJyB9LFxyXG4gICAgfTtcclxuXHJcbiAgICBldmVudC53YWl0VW50aWwoXHJcbiAgICAgIHNlbGYucmVnaXN0cmF0aW9uLnNob3dOb3RpZmljYXRpb24oZGF0YS50aXRsZSwgb3B0aW9ucylcclxuICAgICk7XHJcbiAgfVxyXG59KTtcclxuXHJcbi8vIEVzY3V0YSBvIGNsaXF1ZSBuYSBub3RpZmljYcOnw6NvXHJcbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcignbm90aWZpY2F0aW9uY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICBldmVudC5ub3RpZmljYXRpb24uY2xvc2UoKTtcclxuICAvLyBBYnJlIGEgVVJMIGRlZmluaWRhIG91IGEgcmFpelxyXG4gIGV2ZW50LndhaXRVbnRpbChcclxuICAgIGNsaWVudHMub3BlbldpbmRvdyhldmVudC5ub3RpZmljYXRpb24uZGF0YS51cmwpXHJcbiAgKTtcclxufSk7Il0sIm5hbWVzIjpbInNlbGYiLCJhZGRFdmVudExpc3RlbmVyIiwiZXZlbnQiLCJkYXRhIiwidGl0bGUiLCJib2R5IiwianNvbiIsImUiLCJ0ZXh0Iiwib3B0aW9ucyIsImljb24iLCJiYWRnZSIsInZpYnJhdGUiLCJ1cmwiLCJ3YWl0VW50aWwiLCJyZWdpc3RyYXRpb24iLCJzaG93Tm90aWZpY2F0aW9uIiwibm90aWZpY2F0aW9uIiwiY2xvc2UiLCJjbGllbnRzIiwib3BlbldpbmRvdyJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./worker/index.js\n"));

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			if (cachedModule.error !== undefined) throw cachedModule.error;
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/trusted types policy */
/******/ 	!function() {
/******/ 		var policy;
/******/ 		__webpack_require__.tt = function() {
/******/ 			// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.
/******/ 			if (policy === undefined) {
/******/ 				policy = {
/******/ 					createScript: function(script) { return script; }
/******/ 				};
/******/ 				if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {
/******/ 					policy = trustedTypes.createPolicy("nextjs#bundler", policy);
/******/ 				}
/******/ 			}
/******/ 			return policy;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script */
/******/ 	!function() {
/******/ 		__webpack_require__.ts = function(script) { return __webpack_require__.tt().createScript(script); };
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/react refresh */
/******/ 	!function() {
/******/ 		if (__webpack_require__.i) {
/******/ 		__webpack_require__.i.push(function(options) {
/******/ 			var originalFactory = options.factory;
/******/ 			options.factory = function(moduleObject, moduleExports, webpackRequire) {
/******/ 				var hasRefresh = typeof self !== "undefined" && !!self.$RefreshInterceptModuleExecution$;
/******/ 				var cleanup = hasRefresh ? self.$RefreshInterceptModuleExecution$(moduleObject.id) : function() {};
/******/ 				try {
/******/ 					originalFactory.call(this, moduleObject, moduleExports, webpackRequire);
/******/ 				} finally {
/******/ 					cleanup();
/******/ 				}
/******/ 			}
/******/ 		})
/******/ 		}
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	
/******/ 	// noop fns to prevent runtime errors during initialization
/******/ 	if (typeof self !== "undefined") {
/******/ 		self.$RefreshReg$ = function () {};
/******/ 		self.$RefreshSig$ = function () {
/******/ 			return function (type) {
/******/ 				return type;
/******/ 			};
/******/ 		};
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval-source-map devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./worker/index.js");
/******/ 	
/******/ })()
;