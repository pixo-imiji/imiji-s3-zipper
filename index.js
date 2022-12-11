const stream = require("stream");
const AWS = require("aws-sdk");
const s3Zip = require("s3-zip");
const env = require("./env.production");
const emailService = require("./emailService");
const mediaService = require("./mediaService");

module.exports = async (email, partyId, isOwner) => {
    return new Promise((resolve, reject) => {
        try {
            const zipFileName = email + "_" + new Date().getTime() + "_album.zip";
            const s3Public = new AWS.S3(env.objectStore.ibmS3Public);
            const s3 = new AWS.S3(env.objectStore.ibmS3Private);

            const day = 86400;
            const createZipLink = (params) => s3Public.getSignedUrl("getObject", {...params, Expires: day * 2});

            const uploadFromStream = (email) => {
                const pass = new stream.PassThrough();
                const params = {Bucket: env.objectStore.buckets.zip, Key: zipFileName, Body: pass};
                s3.upload(params, (err, data) => err ? reject(err) : null);
                pass.on("error", reject);
                pass.on("end", () => emailService
                    .sendDownloadLink(email, [createZipLink({Bucket: params.Bucket, Key: params.Key})])
                    .then(resolve)
                    .catch(reject)
                );
                return pass;
            };

            const createZipFile = async () => {
                const medias = await mediaService.getValidMedias(partyId, isOwner);
                const files = medias.map(media => "/" + media.fileId);
                const filesZip = medias.map(media => ({name: media.name}));
                s3Zip
                    .archive({
                        s3,
                        bucket: env.objectStore.buckets.origin,
                        preserveFolderStructure: true,
                        debug: true
                    }, partyId, files, filesZip)
                    .pipe(uploadFromStream(email))
            };
            return createZipFile();
        } catch (e) {
            reject(e);
        }
    });

};