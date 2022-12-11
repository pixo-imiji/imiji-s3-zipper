const axios = require("axios");
const env = require("./env.production");

const sendDownloadLink = async (email = "", links = []) => await axios.post(env.fun.downloadZipMail.url, { email, links, serviceType: "download" }, {
    params: {
        blocking: true,
    },
    auth: {
        username: env.fun.downloadZipMail.auth.username,
        password: env.fun.downloadZipMail.auth.password
    }
});

module.exports = {sendDownloadLink};