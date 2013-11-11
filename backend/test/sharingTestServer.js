var http = require('http');

http
.createServer(function (request, response) {
    console.log('new request: ' + request.url);
    var requestData = '';
    if (request.url.search('updateQuestion') === 1) {
        request.addListener('data', function (chunk) { requestData += chunk; });
        request.addListener('end', function () {
            try {
                var body = JSON.parse(requestData);
                if (body.secret === 'a9ed469a2406a7a9') {
                    console.log('received question update:');
                    console.log(body.data);
                    response.writeHead(200);
                    return response.end();
                }
            } catch (e) {
                console.log('erroneous request');
                response.writeHead(400);
                return response.end();
            }
            response.writeHead(400);
            return response.end();
        });
    }
})
.listen(3000);
