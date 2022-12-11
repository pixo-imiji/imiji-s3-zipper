const {MongoClient, ObjectId} = require("mongodb");
const env = require("./env.production");
const dbName = "imiji";

const getNextFileName = (fileName = "", names = [], round = 0) => {
    if (names.includes(fileName)) {
        return getNextFileName(round + "_" + fileName, names, round + 1);
    }
    return fileName;
};

const getValidMedias = async (partyId, isOwner) => {
    const client = await MongoClient.connect(env.mongodb.ibm.url);
    try {
        const db = client.db(dbName);
        const mediaModel = db.collection("media");
        let medias = await mediaModel.find({ partyID: ObjectId(partyId), state: "published" }).toArray();
        const names = [];
        if (!isOwner && medias.length > 0) {
            const {partyID} = medias[0];
            const partyModel = db.collection("parties");
            const {chapters} = await partyModel.findOne({_id: partyID});
            const lockedChapters = chapters.filter(chapter => chapter.locked).map(chapter => chapter._id.toString());
            medias = medias.filter(media => media.chapterID ? !lockedChapters.includes(media.chapterID.toString()) : true);
        }
        return medias.map(media => {
            names.push(media.title);
            return { name: getNextFileName(media.title, names, 1), fileId: media._fileID };
        });
    } catch (err) {
        console.log(err);
    } finally {
        await client.close();
    }
};

module.exports = { getValidMedias };