var crypto = require('crypto');
var http = require('https');

var defaultHashPrevBlock = "0000000000000000000000000000000000000000000000000000000000000000";

function getBlock(id, callback){
	return http.get({
        host: 'blockexplorer.com',
        path: '/api/block/' + id
    }, function(response){
		var block = '';
        response.on('data', function(d) {
            block += d;
        });
        response.on('end', function() {
			callback(JSON.parse(block));
        });
		response.on('error', function(d) {
			console.log('error');
		});
	})
	.end()
	.data;
}

function reverseHexString(s){
	return s.match(/.{2}/g).reverse().join("");
}
	
function buildBlockHeader(genesisBlock){
	var buffer = new Buffer(4);
	buffer.fill(0);
	buffer.writeUInt32LE(genesisBlock.version);
	var merkleroot = reverseHexString(genesisBlock.merkleroot);
	var time = reverseHexString(genesisBlock.time.toString(16));
	var bits = reverseHexString(genesisBlock.bits);
	var nonce = reverseHexString(genesisBlock.nonce.toString(16));
	var hashPrevBlock = typeof genesisBlock.previousblockhash == 'undefined' ? defaultHashPrevBlock : reverseHexString(genesisBlock.previousblockhash);
	
	//still not sure about hashPrevBlock
	return buffer.toString('hex') + hashPrevBlock +	merkleroot + time + bits + nonce;
}
	
function verifyHash(genesisBlock){
	var blockHeader = buildBlockHeader(genesisBlock);
	var buffer = new Buffer(blockHeader, 'hex');

	var data = 
		crypto.createHash('sha256').update(
			crypto.createHash('sha256').update(buffer).digest())
			.digest("hex");

	return reverseHexString(data) == genesisBlock.hash;
}

var id = process.argv.length;
if(process.argv.length <= 2){
	console.log("Add block id to the input");
	return;
}

var verifyHashCallback = function(block){
	console.log(verifyHash(block));
}
getBlock(process.argv[2], verifyHashCallback);