var fs = require('fs'),
	path = require('path'),
	auths = require('./auths.js'),
	prefs = require('./prefs.js'),
	server = require('./server.js'),
	clientSidePluginNames;

exports.configure = function(miaou){
	clientSidePluginNames = (miaou.config.plugins||[]).filter(function(n){
		return fs.existsSync(path.resolve(__dirname, '..', n, '..', 'client-scripts'))
	}).map(function(p) {
		return p.split('/').slice(-2,-1)[0]
	});
	return this;
}

exports.appGet = function(req, res, db){
	db.on()
	.then(function(){
		var roomId = +req.params[0],
			userId = req.user.id;
		return [
			this.fetchRoomAndUserAuth(roomId, userId),
			this.getRoomUserActiveBan(roomId, userId),
			prefs.get.call(this, userId)
		]
	})
	.spread(function(room, ban, prefs){
		room.path = server.roomPath(room);
		req.session.room = room;
		if (ban || (room.private && !auths.checkAtLeast(room.auth, 'write'))) {
			return this.getLastAccessRequest(room.id, req.user.id).then(function(ar){
				res.render('request.jade', { room:room, lastAccessRequest:ar });
			});
		}
		res.render(server.mobile(req) ? 'chat.mob.jade' : 'chat.jade', {
			user:JSON.stringify(req.user),
			room:room,
			userPrefs:prefs,
			pluginsToStart:JSON.stringify(clientSidePluginNames)
		});
		//~ console.dir(req.session);
	}).catch(db.NoRowError, function(){
		// not an error as it happens when there's no room id in url
		res.redirect(server.url('/rooms'));
	}).finally(db.off);
}
