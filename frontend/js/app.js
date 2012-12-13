// define config
requirejs.config({
    paths: {
        'libs': '../js-libs'
    },
    shim: {
        'bootstrap.min': {
            deps: ['jquery.min']
        }
    }
});

// load common libraries
define(["libs/jquery.min", "libs/bootstrap.min", "libs/handlebars.min"], function(){
    // define vars
    var logicServer = "http://localhost:8000/";

    var app = {
        LogicServer: logicServer,
        user: "",
        question: {}
    };
    return app;
});