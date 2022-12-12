const zipper = require("./index"); // pass email and partyId required

const {MongoClient} = require("mongodb");
const env = require("./env.production");
const mongoDbQueue = require("@openwar/mongodb-queue");

const hour = 60 * 60;

const getNextMsg = async (queue) => {
    const msg = await queue.get();
    if (msg) {
        const {payload} = msg;
        const {partyId, email, isOwner} = payload;
        await zipper(email, partyId, isOwner);
        console.log("sent email to:", email);
    } else {
        return setTimeout(() => getNextMsg(queue), 2500);
    }
    return process.nextTick(() => getNextMsg(queue));
};

(async () => {
    const client = await MongoClient.connect(env.mongodb.ibm.url);
    const db = client.db(env.queue.zipper.dbName);
    await client.connect();
    const queue = mongoDbQueue(db, env.queue.zipper.queueName);
    return getNextMsg(queue);
})();