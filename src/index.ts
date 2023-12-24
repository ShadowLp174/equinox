require("dotenv").config();
import bodyParser from "body-parser";
import { Client } from "cassandra-driver";
import cors from "cors";
import express from "express";
import fs from "fs";

const {
    SCYLLA_CONTACT_POINTS,
    SCYLLA_DATA_CENTER,
    SCYLLA_USERNAME,
    SCYLLA_PASSWORD,
    SCYLLA_KEYSPACE,
    ENV,
    PORT,
} = process.env;


if (!SCYLLA_CONTACT_POINTS) throw new Error("Missing an array of contact points for cassandra or scylla in the environmental variables.");
if (!SCYLLA_DATA_CENTER) throw new Error("Missing data center for cassandra or scylla in the environmental variables.");
if (!SCYLLA_KEYSPACE) throw new Error("Missing keyspace for cassandra or scylla in the environmental variables.");

const app = express();
app.use(cors());
app.use(bodyParser.json());

let cassandra: Client = new Client({
    contactPoints: JSON.parse(SCYLLA_CONTACT_POINTS),
    localDataCenter: SCYLLA_DATA_CENTER,
    keyspace: SCYLLA_KEYSPACE,
    credentials: (SCYLLA_USERNAME && SCYLLA_PASSWORD) ? {
        username: SCYLLA_USERNAME,
        password: SCYLLA_PASSWORD
    } : undefined
});

const startServer = async () => {
    const port = PORT ?? 443;

    const versions = fs.readdirSync("src/routes");

    for (const version of versions) {
        const routes = fs.readdirSync(`src/routes/${version}`);
        for (const route of routes) {
            app.use(`/${version}/${route.replace(".ts", '')}`, require(`./routes/${version}/${route}`).default);
        }
    }

    app.get("/", (_req, res) => {
        res.redirect("/v1");
    });

    app.get("/v1", async (_req, res) => {
        res.status(200).json({ version: "1.0.0", release: "Early Alpha", ws: "wss://stargate.strafe.chat", file_system: "https://nebula.strafe.chat", web_application: "https://web.strafe.chat" });
    });

    app.listen(port, () => {
        console.log(`Equinox is listening on ${port}!`);
    });
};

(async () => {
    await cassandra.connect();
    await startServer();
})();