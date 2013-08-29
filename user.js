var User = function (socket, Server) {
    this.socket = socket;
    this.ip = socket._ip;
    this.server = Server;
    this.channel = null;

    this.registered = this.loggedIn = false;
    this.rank = this.global_rank = -1;
    this.name = this.canonicalName = "";

    this.icon = false;
    // TODO move muted to checking in an array in the channel
    this.muted = false;
    this.profile = {
        image: "",
        text: ""
    };

    this.afk = false;
    this.afkTimer = false;

    this.queueLimiter = $util.newRateLimiter();
    this.chatLimiter = $util.newRateLimiter();

    if (Server.announcement !== null) {
        this.socket.emit("announcement", Server.announcement);
    }

    this.initCallbacks();
};

User.prototype.send = function (msg, data) {
    this.socket.emit(msg, data);
};

User.prototype.listPlaylists = function () {
    var self = this;
    self.server.db.listUserPlaylists(self.name, function (err, list) {
        if (err) {
            self.send("listPlaylists", {
                pllist: [],
                error: "Internal error: " + err
            });
            return;
        }

        for (var i = 0; i < list.length; i++) {
            list[i].time = $util.formatTime(list[i].time);
        }

        self.send("listPlaylists", {
            pllist: list
        });
    });
};

User.prototype.initCallbacks = function () {
    var self = this,
        sock = this.socket;

    sock.on("disconnect", function () {
        if (self.afkTimer)
            clearTimeout(self.afkTimer);

        if (self.channel !== null)
            self.channel.handleDisconnect(self);
    });

    sock.on("joinChannel", function (data) {
        if (self.channel !== null)
        // TODO handleDisconnect needs to unbind whatever handleJoin binds
            self.channel.handleDisconnect(self);

        if (typeof data.name !== "string")
            return;

        if (!$util.isValidChannelName(data.name)) {
            self.send("errorMsg", {
                msg: "Invalid channel name.  Channel names may consist of "+
                     "1-30 characters in the set a-z, A-Z, 0-9, -, and _"
            });
            return;
        }

        var cname = data.name.toLowerCase();
        self.channel = self.server.getChannel(cname);
        // TODO handleJoin should take care of looking up channel rank
        self.channel.handleJoin(self);
        self.autoAFK();
    });

    sock.on("login", function (data) {
        var name = data.name || "";
        var pw = data.pw || "";
        var session = data.session || "";

        // TODO login() should handle truncating password length
        if (self.name === "")
            self.login(name, pw, session);
    });

    // TODO a bunch more need to be registered by the channel
    sock.on("listPlaylists", function () {
        if (!self.registered) {
            self.send("listPlaylists", {
                pllist: [],
                error: "You must be registered and logged in to manage "+
                       "playlists."
            });
            return;
        }

        self.listPlaylists();
    });

    sock.on("savePlaylist", function (data) {
        if (!self.registered) {
            self.send("savePlaylist", {
                success: false,
                error: "You must be registered and logged in to manage "+
                       "playlists"
            });
            return;
        }

        if (self.channel === null) {
            self.send("savePlaylist", {
                success: false,
                error: "Not in a channel"
            });
            return;
        }

        if (typeof data.name != "string")
            return;

        var pl = self.channel.playlist.items.toArray();
         self.server.db.saveUserPlaylist(pl, self.name, data.name,
                                         function (err, res) {
            if (err) {
                self.socket.emit("savePlaylist", {
                    success: false,
                    error: "Internal error: " + err
                });
                return;
            }

            self.socket.emit("savePlaylist", {
                success: true
            });

            self.listPlaylists();
        });
    });

    sock.on("deletePlaylist", function (data) {
        if (typeof data.name != "string")
            return;

        self.server.db.deleteUserPlaylist(self.name, data.name,
                                          function () {
            self.listPlaylists();
        });
    });

    sock.on("acp-init", function () {
        if (self.isSiteAdministrator())
            self.server.acp.init(self);
    });

    sock.on("borrow-rank", function (rank) {
        if (!self.isSiteAdministrator())
            return;

        if (rank > self.global_rank)
            return;

        self.setRank(rank);
    });
};

User.prototype.setAFK = function (afk) {
    if (this.channel === null)
        return;
    if (this.afk === afk)
        return;

    var chan = this.channel;
    this.afk = afk;
    if (afk) {
        if (chan.afkers.indexOf(this.canonicalName) == -1)
            chan.afkers.push(this.canonicalName);
        if (chan.voteskip)
            chan.voteskip.unvote(this.ip);
    } else {
        if (chan.afkers.indexOf(this.canonicalName) != -1)
            chan.afkers.splice(chan.afkers.indexOf(this.canonicalName), 1);
        this.autoAFK();
    }

    chan.checkVoteskipPass();
    chan.sendAll("setAFK", {
        name: this.name,
        afk: afk
    });
};

User.prototype.autoAFK = function () {
    var self = this;
    if (self.afkTimer !== false)
        clearTimeout(self.afkTimer);

    if (self.channel === null || self.channel.opts.afk_timeout === 0)
        return;

    self.afkTimer = setTimeout(function () {
        self.setAFK(true);
    }, self.channel.opts.afk_timeout * 1000);
};

User.prototype.isSiteAdministrator = function () {
    return this.global_rank >= 255;
};

User.prototype.login = function (name, pw, session) {
    var self = this;
    if (pw === "" && session === "") {
        self.guestLogin(name);
        return;
    }

    self.server.db.userLogin(name, pw, session, function (err, row) {
        if (err) {
            self.server.actionlog.record(self.ip, name, "login-failure",
                                         err);
            self.send("login", {
                success: false,
                error: err
            });
            return;
        }

        // TODO channel handleLogin should handle duplicate names
        self.loggedIn = true;
        self.registered = true;
        self.send("login", {
            success: true,
            session: row.session_hash,
            name: name
        });

        Logger.syslog.log(self.ip + " logged in as " + name);
        self.server.db.recordVisit(self.ip, name);
        self.profile = {
            image: row.profile_image,
            text: row.profile_text
        };

        self.global_rank = row.global_rank;
        self.send("rank", self.global_rank);
        if (self.isSiteAdministrator())
            self.server.actionlog.record(self.ip, name, "login-success");

        if (self.channel !== null)
            self.channel.handleLogin(self);
    });

};

var lastguestlogin = {};
User.prototype.guestLogin = function (name) {
    var self = this;
    if (self.ip in lastguestlogin) {
        var diff = (Date.now() - lastguestlogin[self.ip]) / 1000;
        if (diff < self.server.cfg["guest-login-delay"]) {
            self.send("login", {
                success: false,
                error: "Guest logins are restricted to one per ip per " +
                       self.server.cfg["guest-login-delay"] + " seconds."
            });
            return;
        }
    }

    if (!$util.isValidUserName(name)) {
        self.send("login", {
            success: false,
            error: "Invalid username.  Usernames must be 1-20 characters "+
                   "and consist only of alphanumeric characters and "+
                   "underscores"
        });
        return;
    }

    self.server.db.isUsernameTaken(name, function (err, taken) {
        if (err) {
            self.send("login", {
                success: false,
                error: "Internal error: " + err
            });
            return;
        }

        if (taken) {
            self.send("login", {
                success: false,
                error: "That username is taken"
            });
            return;
        }
    });
