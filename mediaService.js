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
        if (medias.length === 0) {
            return medias;
        }
        const {partyID} = medias[0];
        const partyModel = db.collection("parties");
        const {chapters} = await partyModel.findOne({_id: partyID});
        if (!isOwner && medias.length > 0) {
            const lockedChapters = chapters.length ? chapters.filter(chapter => chapter.locked).map(chapter => chapter._id.toString()) : [];
            medias = medias.filter(media => media.chapterID ? !lockedChapters.includes(media.chapterID.toString()) : true);
        }
        medias = medias.map(media => {
            if (media.chapterID) {
                const chapter = chapters.find(chapter => chapter._id.toString() === media.chapterID.toString());
                if (chapter) {
                    media.chapter = chapter;
                }
            }
            return media;
        });
        const tempMedias = [];
        medias.forEach(media => {
            let name = getNextFileName(media.title, names, 1);
            name = media.chapter ? media.chapter.title + "/" + name : name;
            names.push(name);
            tempMedias.push({name, fileId: media._fileID});
        });
        return tempMedias;
    } catch (err) {
        console.log(err);
    } finally {
        await client.close();
    }
};

module.exports = { getValidMedias };