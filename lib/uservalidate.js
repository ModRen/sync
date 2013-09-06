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
};
