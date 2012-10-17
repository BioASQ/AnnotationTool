// define config
requirejs.config({
    paths: {
        'libs':       '../js-libs'
    },
    shim: {
    	'bootstrap.min': {
    		deps: ['jquery.min']
    	}
    }
});

// load common libraries
define(["libs/jquery.min", "libs/bootstrap.min"]);