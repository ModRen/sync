var $util = require("./utilities");

module.exports = {
    checkJoinChannel = function (user, data) {
        if (user.channel !== null)
            return false;

        if (typeof data.name !== "string")
            return false;

        if (!$util.isValidChannelName(data.name)) {
            user.socket.emit("errorMsg", {
                msg: "Invalid channel name.  Channel names may consist of"+
                     " 1-30 characters in the set a-z, A-Z, 0-9, -, and _"
            });
            user.socket.emit("kick", {
                reason: "Bad channel name"
            });
            return false;
        }

        return true;
    },

    checkAssignLeader: function (user, data) {
        if (!user.channel)
            return false;

        if (user.rank < 2)
            return false;

        if (typeof data.name !== "string")
            return false;

        return true;
    },

    checkSetChannelRank: function (user, data) {
        if (!user.channel)
            return false;

        if (typeof data.user !== "string" || typeof data.rank !== "number")
            return false;

        if (data.rank >= user.rank || data.rank < 1)
            return false;

        return true;
    },

    checkUnban: function (user, data) {
        if (!user.channel)
            return false;

        if ("ip_hidden" in data && typeof data.ip_hidden !== "string")
            return false;

        if ("name" in data && typeof data.name !== "string")
            return false;

        return true;
    },

    checkChatMsg: function (user, data) {
        if (!user.channel)
            return false;

        // Should be redundant because of the rank check below
        if (user.name === "")
            return false;

        if (!user.channel.hasPermission(user, "chat"))
            return false;

        if (user.muted) {
            user.socket.emit("noflood", {
                action: "chat",
                msg: "You have been muted on this channel."
            });
            return false;
        }

        if (typeof data.msg !== "string")
            return false;

        return true;
    },

    checkNewPoll: function (user, data) {
        if (!user.channel)
            return false;

        if (!user.channel.hasPermission(user, "pollctl"))
            return false;

        if (typeof data.title !== "string" || typeof data.opts !== "object")
            return false;

        return true;
    },

    checkQueue: function (user, data) {
        if (!user.channel)
            return false;

        if (!user.channel.hasPermission(user, "playlistadd"))
            return false;

        if (typeof data.pos !== "string")
            return false;

        if (typeof data.id !== "string" && data.id !== false)
            return false;

        if (data.pos === "next") {
            if (!user.channel.hasPermission(user, "playlistnext"))
                return false;
        }

        return true;
    },

    checkSetTemp: function (user, data) {
        if (!user.channel)
            return false;

        if (!user.channel.hasPermission(user, "settemp"))
            return false;

        if (typeof data.uid !== "number" || typeof data.temp !== "boolean")
            return false;

        return true;
    },

    checkDelete: function (user, data) {
        if (!user.channel)
            return false;

        if (!user.channel.hasPermission(user, "playlistdelete"))
            return false;

        if (typeof data !== "number")
            return false;

        if (!user.channel.playlist.items.find(data))
            return false;

        return true;
    },

    checkUncache: function (user, data) {
        if (!user.channel)
            return false;

        if (!user.channel.hasPermission(user, "uncache"))
            return false;

        if (typeof data.id !== "string")
            return false;

        return true;
    },

    checkMoveMedia: function (user, data) {
        if (!user.channel)
            return false;

        if (!user.channel.hasPermission(user, "playlistmove"))
            return false;

        if (typeof data.from !== "number")
            return false;

        if (typeof data.after !== "number") {
            if (data.after !== "prepend" && data.after !== "append")
                return false;
        }

        return true;
    },

    checkJumpTo: function (user, data) {
        if (!user.channel)
            return false;

        if (!user.channel.hasPermission(user, "playlistjump"))
            return false;

        if (typeof data !== "number")
            return false;

        return true;
    },

    checkPlayNext: function (user, data) {
        if (!user.channel)
            return false;

        if (!user.channel.hasPermission(user, "playlistjump"))
            return false;

        return true;
    },

    checkClearPlaylist: function (user, data) {
        if (!user.channel)
            return false;

        if (!user.channel.hasPermission(user, "playlistclear"))
            return false;

        return true;
    },

    checkShufflePlaylist: function (user, data) {
        if (!user.channel)
            return false;

        if (!user.channel.hasPermission(user, "playlistshuffle"))
            return false;

        return true;
    },

    checkTogglePlaylistLock: function (user, data) {
        if (!user.channel)
            return false;

        if (user.rank < 2)
            return false;

        return true;
    },

    checkMediaUpdate: function (user, data) { 
        if (!user.channel)
            return false;

        if (user !== channel.leader)
            return false;

        if (typeof data.id !== "string" ||
            typeof data.currentTime !== "number")
            return false;

        if (user.channel.playlist.current === null)
            return false;

        if ($util.isLive(user.channel.playlist.current.media.type)) {
            if (user.channel.playlist.current.media.type !== "jw")
                return false;
        }

        if (user.channel.playlist.current.media.id !== data.id)
            return false;

        return true;
    },

    checkClosePoll: function (user, data) {
        if (!user.channel)
            return false;

        if (!user.channel.hasPermission(user, "pollctl"))
            return false;

        if (!user.channel.poll)
            return false;

        return true;
    },

    checkVote: function (user, data) {
        if (!user.channel)
            return false;

        if (!user.channel.hasPermission(user, "pollvote"))
            return false;

        if (typeof data.option !== "number")
            return false;

        if (!user.channel.poll)
            return false;

        return true;
    },

    checkRegisterChannel: function (user, data) {
        if (!user.channel)
            return false;

        if (user.rank < 10)
            return false;

        return true;
    },

    checkUnregisterChannel: function (user, data) {
        if (!user.channel)
            return false;

        if (user.rank < 10)
            return false;

        if (!user.channel.registered)
            return false;

        return true;
    },

    checkSetOptions: function (user, data) {
        if (!user.channel)
            return false;

        if (user.rank < 2)
            return false;

        return true;
    },

    checkSetPermissions: function (user, data) {
        if (!user.channel)
            return false;

        if (user.rank < 3)
            return false;

        return true;
    },

    checkSetChannelCSS: function (user, data) {
        if (!user.channel)
            return false;

        if (user.rank < 3)
            return false;

        if (typeof data.css !== "string")
            return false;

        return true;
    },

    checkSetChannelJS: function (user, data) {
        if (!user.channel)
            return false;

        if (user.rank < 3)
            return false;

        if (typeof data.js !== "string")
            return false;

        return true;
    },

    checkUpdateFilter: function (user, data) {
        if (!user.channel)
            return false;

        if (!user.channel.hasPermission(user, "filteredit"))
            return false;

        if (typeof f.source !== "string" || typeof f.replace !== "string" ||
            typeof f.flags !== "string"  || typeof f.name !== "string")
            return false;

        if ("active" in f && typeof f.active !== "boolean")
            return false;

        if ("filterlinks" in f && typeof f.filterlinks !== "boolean")
            return false;

        var re = f.source,
            flags = f.flags;

        try {
            new RegExp(re, flags);
        } catch (e) {
            return false;
        }

        return true;
    },

    checkRemoveFilter: function (user, data) {
        if (!user.channel)
            return false;

        if (!user.channel.hasPermission(user, "filteredit"))
            return false;

        if (typeof filter.name !== "string")
            return false;

        return true;
    },

    checkMoveFilter: function (user, data) {
        if (!user.channel)
            return false;

        if (!user.channel.hasPermission(user, "filteredit")
            return false;

        if (typeof data.to !== "number" || typeof data.from !== "number")
            return false;

        return true;
    },

    checkSetMotd: function (user, data) {
        if (!user.channel)
            return false;

        if (!user.channel.hasPermission(user, "motdedit"))
            return false;

        if (typeof data.motd !== "string")
            return false;

        return true;
    },

    checkRequestLoginHistory: function (user, data) {

    },

    checkRequestBanlist: function (user, data) {

    },

    checkRequestChatFilters: function (user, data) {

    },

    checkRequestChannelRanks: function (user, data) {

    },

    checkVoteskip: function (user, data) {

    },

    checkSavePlaylist: function (user, data) {

    },

    checkQueuePlaylist: function (user, data) {

    },

    checkDeletePlaylist: function (user, data) {

    },

    checkReadChanLog: function (user, data) {

    },

    checkAcpInit: function (user, data) {

    },

    checkBorrowRank: function (user, data) {

    },
};
