const {MongoClient, ObjectId} = require("mongodb");
const env = require("./env.production");
const dbName = "imiji";

const getNextFileName = (fileName = "", names = [], round = 0) => {
    if (names.includes(fileName)) {
        return getNextFileName(round + "_" + fileName, names, round + 1);
    }
    return fileName;
};

const mapS3FilesToFileIds = (files = [""]) => files.map(file => file.split("/").length > 1 ? file.split("/")[1] : file);

const getValidMedias = async (partyId) => {
    const client = await MongoClient.connect(env.mongodb.ibm.url);
    try {
        const db = client.db(dbName);
        const mediaModel = db.collection("media");
        const medias = await mediaModel.find({ partyID: ObjectId(partyId), state: "published" }).toArray();
        const names = medias.map(media => media.title);
        return medias.map(media => ({ name: getNextFileName(media.title, names, 1), fileId: media._fileID }));
    } catch (err) {
        console.log(err);
    } finally {
        await client.close();
    }
};

const convertFileIdsToNames = async (files) => {
    const client = await MongoClient.connect(env.mongodb.ibm.url);
    try {
        console.log("connected");
        const fileIds = mapS3FilesToFileIds(files);
        const db = client.db(dbName);
        const mediaModel = db.collection("media");
        const names = [];
        const medias = await mediaModel.find({_fileID: {$in: fileIds}}).toArray();
        return fileIds.map(fileId => {
            const media = medias.find(media => media._fileID === fileId);
            if (media) {
                const fileName = getNextFileName(media.title, names, 1);
                names.push(fileName);
                return fileName;
            }
            return fileId;
        });
    } catch (err) {
        console.log(err);
    } finally {
        await client.close();
    }
};

module.exports = {getValidMedias, convertFileIdsToNames, mapS3FilesToFileIds};