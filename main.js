var crypto = require('crypto');
var http = require('https');

Array.prototype.last = function() {
    return this[this.length-1];
}

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

function doubleHash(data){
	var hashed = 
		crypto.createHash('sha256').update(
			crypto.createHash('sha256').update(data).digest())
			.digest("hex");
	return hashed;
}

function getMerkleRootAux(transactions){
	if(transactions.length == 1){
		return transactions[0];
	}
	var combinedTransactions = []
	if(transactions.length % 2 != 0){
		transactions.push(transactions.last());
	}
	console.log(transactions);
	for(var idx = 0; idx < transactions.length; idx+=2){
		var buffers = [new Buffer(reverseHexString(transactions[idx]), 'hex'), new Buffer(reverseHexString(transactions[idx + 1]), 'hex')];
		combinedTransactions.push(reverseHexString(doubleHash(Buffer.concat(buffers))));
	}
	return getMerkleRootAux(combinedTransactions);
}

function getMerkleRoot(genesisBlock){
	var transactions = genesisBlock.tx.slice();
	return reverseHexString(getMerkleRootAux(transactions));
}

function buildBlockHeader(genesisBlock){
	var buffer = new Buffer(4);
	buffer.fill(0);
	buffer.writeUInt32LE(genesisBlock.version);
	
	var merkleroot = getMerkleRoot(genesisBlock);	
	var time = reverseHexString(genesisBlock.time.toString(16));
	var bits = reverseHexString(genesisBlock.bits);
	var nonce = reverseHexString(genesisBlock.nonce.toString(16));
	var hashPrevBlock = typeof genesisBlock.previousblockhash == 'undefined' ? defaultHashPrevBlock : reverseHexString(genesisBlock.previousblockhash);
	
	return buffer.toString('hex') + hashPrevBlock +	merkleroot + time + bits + nonce;
}
	
function verifyHash(genesisBlock){
	var blockHeader = buildBlockHeader(genesisBlock);
	var buffer = new Buffer(blockHeader, 'hex');
	var data = doubleHash(buffer);
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