function _isPrivateIPAddress(ip) {
	// Assumes well-formed IPv4
	// See http://en.wikipedia.org/wiki/Private_network#Private_IPv4_address_spaces
	return (ip.substring(0, 8) === '192.168.') ||
		(ip.substring(0, 3) === '10.') ||
		(ip.substring(0, 4) === '172.'
			&& 15 < parseInt(ip.split('.')[1])
			&& parseInt(ip.split('.')[1]) < 32);
};

var Helper = {
    getPrivateAddresses: function() {
        var ifaces = require('os').networkInterfaces(),
            ips = [];

        for (var dev in ifaces) {
            // Each device can have several IPs.
            ifaces[dev].forEach(function (details) {
                if (details.family === 'IPv4' && _isPrivateIPAddress(details.address)
                    && (!/(loopback|vmware|virtualbox|internal|hamachi|vboxnet)/g.test(dev.toLowerCase()))
                ) {
                    ips.push(details.address);
                }
            });
        }
        return ips;
    }
};

module.exports = Helper;
