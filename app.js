const zipper = require("./index"); // pass email and partyId required

const {MongoClient} = require("mongodb");
const env = require("./env.production");
const mongoDbQueue = require("mongodb-queue-up");

const getNextMsg = async (queue) => {
    const msg = await (new Promise((resolve, reject) =>  queue.get({visibility: 60 * 60 * 3}, (err, msg) => err ? reject(err) : resolve(msg)))).then();
    if (msg) {
        const {payload, ack} = msg;
        console.log("process:", ack);
        const {partyId, email, isOwner} = payload;
        await zipper(email, partyId, isOwner);
        console.log("sent email to:", email);
        await (new Promise((resolve, reject) =>  queue.ack(ack, (err, msg) => err ? reject(err) : resolve(msg)))).then();
        console.log("deleted job:", msg.ack);
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