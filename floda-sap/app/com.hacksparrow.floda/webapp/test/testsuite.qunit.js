sap.ui.define(function () {
	"use strict";

	return {
		name: "QUnit test suite for the UI5 Application: com.hacksparrow.floda",
		defaults: {
			page: "ui5://test-resources/com/hacksparrow/floda/Test.qunit.html?testsuite={suite}&test={name}",
			qunit: {
				version: 2
			},
			sinon: {
				version: 1
			},
			ui5: {
				language: "EN",
				theme: "sap_horizon"
			},
			coverage: {
				only: "com/hacksparrow/floda/",
				never: "test-resources/com/hacksparrow/floda/"
			},
			loader: {
				paths: {
					"com/hacksparrow/floda": "../"
				}
			}
		},
		tests: {
			"unit/unitTests": {
				title: "Unit tests for com.hacksparrow.floda"
			},
			"integration/opaTests": {
				title: "Integration tests for com.hacksparrow.floda"
			}
		}
	};
});
