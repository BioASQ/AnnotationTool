var fs       = require('fs'),
    util     = require('util'),
    assert   = require('assert'),
    program  = require('commander');

program
    .option('-q, --questions <file name>', 'JSON file with questions')
    .option('-c, --common-questions <file name>', 'JSON file with common questions')
    .option('-m, --common-map <file name>', 'JSON file mapping each question ID to its common counterpart')
    .parse(process.argv);

var data = {};

try {
    var k;
    ['questions', 'commonQuestions', 'commonMap'].forEach(function (key) {
        if (typeof program[key] == 'undefined')
            program.help();
        k = key;
        var contents = fs.readFileSync(program[key]);
        data[key] = contents.length ? JSON.parse(contents) : [];
    });
} catch (error) {
    console.error(error);
    console.error(error.stack);
    process.stderr.write('Could not parse file: ' + program[k] + '\n');
    process.exit(-1);
}

data.questions.forEach(function (question) {
    if (typeof data.commonMap[question._id] == 'undefined')
        return;

    var commonAnswer = data.commonQuestions.filter(function (commonQuestion) {
        return (commonQuestion._id === data.commonMap[question._id]);
    }).map(function (commonQuestion) {
        return commonQuestion.answer.ideal;
    }).shift();

    var res = question.answer.ideal.some(function (idealAnswer) {
        return (idealAnswer.body === commonAnswer);
    });
    assert.ok(res);
});
