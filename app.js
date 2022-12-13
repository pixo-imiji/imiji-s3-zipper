const zipper = require("./index"); // pass email and partyId required

const {MongoClient} = require("mongodb");
const env = require("./env.production");
const mongoDbQueue = require("mongodb-queue");

const getNextMsg = async (queue) => {
    const msg = await (new Promise((resolve, reject) =>  queue.get({visibility: 60 * 60 * 3}, (err, msg) => err ? reject(err) : resolve(msg))));
    if (msg) {
        const {payload} = msg;
        const {partyId, email, isOwner} = payload;
        await zipper(email, partyId, isOwner);
        await (new Promise((resolve, reject) =>  queue.ack((err, msg) => err ? reject(err) : resolve(msg))));
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