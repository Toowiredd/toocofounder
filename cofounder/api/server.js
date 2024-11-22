import { Server } from "socket.io";
import utils from "@/utils/index.js";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import yargs from "yargs";
import fs from "fs";
import yaml from "yaml";
import { hideBin } from "yargs/helpers";
import { merge } from "lodash-es";
import open, { openApp, apps } from "open";
import cofounder from "./build.js";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
dotenv.config();

/**
 * Helper function to slugify a given text.
 * @param {string} text - The text to be slugified.
 * @returns {string} - The slugified text.
 */
function _slugify(text) {
	return text
		.toString()
		.toLowerCase()
		.replace(/\s+/g, "-") // Replace spaces with -
		.replace(/[^\w\-]+/g, "") // Remove all non-word chars
		.replace(/\-\-+/g, "-") // Replace multiple - with single -
		.replace(/^-+/, "") // Trim - from start
		.replace(/-+$/, ""); // Trim - from end
}

/**
 * Function to create a new project based on command line arguments.
 * It initializes the project with the provided description and aesthetics.
 */
async function create_new_project() {
	if (!new_project.description.length) {
		console.error(
			'Error: -d "project description" is required and cannot be empty.',
		);
		process.exit(1);
	}
	console.log(
		`\x1b[31minitialized generating app : ${new_project.project}\x1b[0m`,
	);
	console.log(
		`\x1b[34m(see ${process.env.EXPORT_APPS_ROOT}/${new_project.project}/README.md for more details)\x1b[0m` +
			`\n\x1b[38;5;37mto start app (api+frontend in parallel)` +
			`\n\t> cd ${process.env.EXPORT_APPS_ROOT}/${new_project.project}` +
			`\n\t> npm i && npm run dev\x1b[0m`,
	);

	const query = {
		pm: {
			details: {
				text: `${new_project.project != `project-${timestamp}` ? "Project '" + new_project.project + "' :" : ""} ${new_project.description}`,
				attachments: [],
				design: {
					aesthetics: {
						text: new_project.aesthetics,
					},
				},
			},
		},
	};
	console.dir({ query }, { depth: null });

	await cofounder.system.run({
		id: `seq:project:init:v1`,
		context: {
			...context,
			project: new_project.project,
		},
		data: query,
	});
}

// Call create_new_project if command args for init project are provided
if (new_project.project && new_project.description) {
	create_new_project();
}

const app = express();
const PORT = process.env.PORT || 4200;

app.use(cors());
app.use(express.json({ limit: "20mb" }));

// convert the current module's URL to a file path - necessary in ES modules to get the equivalent of __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// serve static content from ./storage ; ie. for generated layout mockup images
app.use("/storage", express.static(path.join(__dirname, "db/storage")));
app.use(express.static(path.join(__dirname, "dist")));
app.use(/^\/(?!storage|api).*$/, express.static(path.join(__dirname, "dist")));

const server = app.listen(PORT, () => {
	console.log(
		"\x1b[33m\n> cofounder/api : server is running on port " + PORT + "\x1b[0m",
	);

	console.log(`> debug : open browser enabled : http://localhost:${PORT}/`);
	open(`http://localhost:${PORT}/`);
});

/**
 * Endpoint to check server status.
 * @route GET /api/ping
 * @returns {Object} - A message indicating the server is running.
 */
app.get("/api/ping", (req, res) => {
	res.status(200).json({ message: "pong" });
});

/**
 * Endpoint to list all projects.
 * @route GET /api/projects/list
 * @returns {Object} - A list of projects with their details.
 */
app.get("/api/projects/list", (req, res) => {
	fs.readdir("./db/projects", (err, files) => {
		if (err) {
			return res.status(500).json({ error: "> cant read projects directory" });
		}
		const projects = files
			.filter((file) =>
				fs.statSync(path.join("./db/projects", file)).isDirectory(),
			)
			.map((projectDir) => {
				const yamlFilePath = path.join(
					"./db/projects",
					projectDir,
					"state/pm/user/details.yaml",
				);
				if (fs.existsSync(yamlFilePath)) {
					const fileContent = fs.readFileSync(yamlFilePath, "utf8");
					const parsedData = yaml.parse(fileContent);
					return { id: projectDir, data: parsedData.data || false };
				}
				return { id: projectDir, data: false };
			});
		res.status(200).json({ projects });
	});
});

/**
 * Endpoint to transcribe audio to text.
 * @route POST /api/utils/transcribe
 * @param {Object} req - The request object containing the audio data.
 * @param {Object} res - The response object to send the transcript.
 * @returns {Object} - The transcribed text.
 */
app.post("/api/utils/transcribe", async (req, res) => {
	const uid = Math.random().toString(36).slice(2, 11); // Generate a random unique ID
	const tempFilePath = path.join(__dirname, "db/storage/temp", `${uid}.webm`);

	// Ensure the directory exists
	fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });

	try {
		if (!req.body || !req.body.audio) {
			throw new Error("No audio file uploaded");
		}

		const audioData = req.body.audio;
		const audioBuffer = Buffer.from(audioData.split(",")[1], "base64");

		// Write the audio buffer to the temporary path
		fs.writeFileSync(tempFilePath, audioBuffer);

		const { transcript } = await utils.openai.transcribe({ path: tempFilePath });
		res.status(200).json({ transcript });
	} catch (error) {
		console.error("Transcription error:", error);
		res.status(500).json({ error: "Failed to transcribe audio" });
	} finally {
		// Delete the temporary file
		fs.unlink(tempFilePath, (err) => {
			if (err) console.error("Error deleting temporary file:", err);
		});
	}
});

/**
 * Endpoint to create a new project.
 * @route POST /api/projects/new
 * @param {Object} req - The request object containing the project details.
 * @param {Object} res - The response object to send the project ID.
 * @returns {Object} - The created project ID.
 */
app.post("/api/projects/new", async (req, res) => {
	const request = req.body;
	/*
		request : {
			project? : "project-id" || {}
			description: "",
			aeshetics?: ""
		}
	*/
	if (!request.description?.length) {
		return res.status(500).json({ error: "> no project description provided" });
	}
	const timestamp = Date.now();
	const new_project_query = {
		project:
			!request.project?.length ||
			!_slugify(request.project).length ||
			!_slugify(request.project).match(/[a-z0-9]/)
				? `project-${timestamp}`
				: _slugify(request.project),
		description: request.description,
		aesthetics: request.aesthetics?.length ? request.aesthetics : false,
	};

	const query = {
		pm: {
			details: {
				text: `${new_project_query.project != `project-${timestamp}` ? "Project '" + new_project_query.project + "' :\n" : ""}${new_project_query.description}`,
				attachments: [],
				design: {
					aesthetics: {
						text: new_project_query.aesthetics,
					},
				},
				timestamp,
			},
		},
	};

	// call async
	cofounder.system.run({
		id: `seq:project:init:v1`,
		context: {
			...context, // {streams}
			project: new_project_query.project,
		},
		data: query,
	});

	res.status(200).json({ project: new_project_query.project });
});

/**
 * Endpoint to resume a project.
 * @route POST /api/project/resume
 * @param {Object} req - The request object containing the project ID.
 * @param {Object} res - The response object to send the project ID.
 * @returns {Object} - The resumed project ID.
 */
app.post("/api/project/resume", async (req, res) => {
	const { project } = req.body;
	const resume_response = await resume_project({ project });
	console.dir({ "debug:server:project/resume": resume_response });
	setTimeout(async () => {
		await cofounder.system.run({
			id: `seq:project:init:v1`,
			context: {
				...context, // {streams}
				project,
				sequence: {
					resume: resume_response.resume,
				},
			},
			data: resume_response.data,
		});
	}, 2000);
	res.status(200).json({ project });
});

const actions = {
	// map action to function ; load means load project state before passing
	"update:settings:preferences:versions": {
		fn: _updateProjectPreferences,
		load: false,
	},
	"regenerate:ui": { fn: _regenerateUiComponent, load: true },
	"iterate:ui": { fn: _iterateUiComponent, load: true },
};

/**
 * Endpoint to handle various project actions.
 * @route POST /api/project/actions
 * @param {Object} req - The request object containing the action details.
 * @param {Object} res - The response object to send the action result.
 * @returns {Object} - The result of the action.
 */
app.post("/api/project/actions", async (req, res) => {
	/*
		in : {
			project : `exampleproject`,
			query : {
				action : "example:action:whatever",
				data : {
				},
			},
		}
	*/
	console.dir(
		{ "cofounder:api:server:actions:debug": req.body },
		{ depth: null },
	);
	try {
		const { project, query } = req.body;
		const { action } = query;
		if (!actionsKeys.includes(action)) {
			throw new Error(`action ${action} not recognized`);
		}
		const { fn, load } = actions[action];
		const data = await fn({
			request: { project, query },
			data: !load
				? {}
				: await cofounder.system.run({
						id: "op:PROJECT::STATE:LOAD",
						context: {
							...context,
							project,
						},
						data: {},
					}),
		});
		res.status(200).json({ end: true });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "failed to process" });
	}
});

const io = new Server(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
	},
});
const subscriptions = {};
const projects = {};
// will be sent inside context{} for system nodes to stream to at various steps
const streams = {
	start: async ({ project, key, meta }) => {
		/*
			project , key , meta { name , desc }
		*/
		// console.dir({"debug:context:streams" : {subscriptions}} , {depth:null})
		if (subscriptions[project])
			io
				.to(subscriptions[project])
				.emit("stream$start", { timestamp: Date.now(), key, meta });
	},
	write: async ({ project, key, data }) => {
		if (subscriptions[project])
			io.to(subscriptions[project]).emit("stream$data", {
				key,
				data,
			});
	},
	end: async ({ project, key }) => {
		if (subscriptions[project])
			io
				.to(subscriptions[project])
				.emit("stream$end", { timestamp: Date.now(), key });
	},
	update: async ({ project, key, data }) => {
		if (!subscriptions[project]) return;
		// console.log('> debug:streams:update :', key)

		if (key.includes("webapp.")) {
			// reconstruct state
			let projectSubState = {};
			const keys = key.split(".");
			let newStateUpdate = projectSubState;
			keys.forEach((k, index) => {
				if (!newStateUpdate[k]) {
					newStateUpdate[k] = index === keys.length - 1 ? data : {};
				} else if (index === keys.length - 1) {
					newStateUpdate[k] = merge(newStateUpdate[k], data);
				}
				newStateUpdate = newStateUpdate[k];
			});
			const new_update_data = {};
			let mergedKey;
			Object.keys(projectSubState.webapp).map((_type) => {
				// _type : react || layout
				Object.keys(projectSubState.webapp[_type]).map((_category) => {
					// _category : root || store || views
					Object.keys(projectSubState.webapp[_type][_category]).map((_id) => {
						// _id : app || redux || GV_Whatever || ...
						mergedKey = `webapp.${_type}.${_category}.${_id}`;
						new_update_data[mergedKey] = {};
						Object.keys(projectSubState.webapp[_type][_category][_id]).map(
							(_version) => {
								// _version : latest || {timestamp}
								new_update_data[mergedKey][_version] =
									projectSubState.webapp[_type][_category][_id][_version];
							},
						);
					});
				});
			});
			key = mergedKey;
			data = new_update_data[mergedKey];
		}
		io.to(subscriptions[project]).emit("state$update", {
			key,
			data,
		});
	},
};
const context = { streams };

io.on("connection", async (socket) => {
	console.log("> user connected : ", socket.id);
	socket.on("subscribe", async (project) => {
		console.log(`> user ${socket.id} subscribed to project : ${project}`);
		if (!subscriptions[project]) {
			subscriptions[project] = [];
		}
		subscriptions[project].push(socket.id);
		try {
			await load_project({ project });
			io.to(subscriptions[project]).emit("state$load", {
				timestamp: Date.now(),
				state: projects[project],
			});
		} catch (e) {
			console.error("> cofounder/api : server error : ", e);
		}
	});
	socket.on("disconnect", () => {
		console.log("> user disconnected : ", socket.id);
		for (const project in subscriptions) {
			subscriptions[project] = subscriptions[project].filter(
				(id) => id !== socket.id,
			);
		}
	});
});

/**
 * Function to load a project from the local storage.
 * @param {Object} param0 - The project details.
 * @returns {Object} - The loaded project state.
 */
const load_project = async ({ project }) => {
	console.log("> load_project : start : ", project);
	const fetchedProject = await utils.load.local({
		project,
		deconstructed: true,
	});
	const fetchedProjectState = fetchedProject.state;
	const _project = fetchedProject.keymap || {};
	let projectData = {};
	Object.keys(_project)
		.filter((key) => !key.startsWith("webapp."))
		.map((key) => {
			projectData[key] = _project[key];
		});
	if (fetchedProjectState.webapp) {
		Object.keys(fetchedProjectState.webapp).map((_type) => {
			// _type : react || layout
			Object.keys(fetchedProjectState.webapp[_type]).map((_category) => {
				// _category : root || store || views
				Object.keys(fetchedProjectState.webapp[_type][_category]).map((_id) => {
					// _id : app || redux || GV_Whatever || ...
					const mergedKey = `webapp.${_type}.${_category}.${_id}`;
					projectData[mergedKey] = {};
					Object.keys(fetchedProjectState.webapp[_type][_category][_id]).map(
						(_version) => {
							// _version : latest || {timestamp}
							projectData[mergedKey][_version] =
								fetchedProjectState.webapp[_type][_category][_id][_version];
						},
					);
				});
			});
		});
	}
	projects[project] = projectData;
	console.dir({
		load_project: project,
		data_keys: `${Object.keys(projects[project]).join(" , ")}`,
	});
	// only use in resume ; else check data stored in projects[project]
	return fetchedProjectState;
};

const seq_projectv1_dag = [
	// dumped from makeDag() in ./build
	[], // project setup , skip
	["pm.prd"],
	["pm.frd"],
	["pm.frd", "pm.uxsmd"],
	["db.schemas", "uxsitemap.structure"],
	["db.postgres"],
	["pm.brd"],
	["backend.specifications.openapi", "backend.specifications.asyncapi"],
	["backend.server.main"],
	["pm.uxdmd"],
	["uxdatamap.structure"],
	["uxdatamap.views"],
	["webapp.react.store.redux"],
	["webapp.react.root.app"],
	["webapp.react.app.views"], // views , latest
];

/**
 * Function to resume a project based on its current state.
 * @param {Object} param0 - The project details.
 * @returns {Object} - The data and resume point for the project.
 */
async function resume_project({ project }) {
	const project_data = await load_project({ project });
	const project_keys = Object.keys(projects[project]);
	let previous_phase_index = -1;
	for (let step of seq_projectv1_dag) {
		previous_phase_index++;
		if (step.length) {
			if (
				step.every((entry) => project_keys.some((key) => key.startsWith(entry)))
			) {
				continue;
			} else {
				break;
			}
		}
	}
	return {
		data: project_data,
		resume: previous_phase_index,
	};
}

/**
 * Function to update project preferences.
 * @param {Object} param0 - The request and data details.
 */
async function _updateProjectPreferences({ request }) {
	/*
		in : {
			project : `exampleproject`,
			query : {
				action : "example:action:whatever",
				data : {
					[views || sections] : {
						[id] : {version}
					}
				},
			},
		}
	*/
	const { project, query } = request;
	await cofounder.system.run({
		id: "op:PROJECT::STATE:UPDATE",
		context: { ...context, project },
		data: {
			operation: {
				id: `settings:preferences:versions`,
			},
			type: `end`,
			content: {
				key: `settings.preferences.versions`,
				data: query.data,
			},
		},
	});
}

/**
 * Function to regenerate a UI component.
 * @param {Object} param0 - The request and data details.
 */
async function _regenerateUiComponent({ request, data }) {
	const { project, query } = request;
	/*
		in : request: {
			project : `exampleproject`,
			query : {
				action : "regenerate:ui"
				data : {
					[views || sections] : `{id}`, // <--- update : sections stuff removed, is views only (for now)
				},
			},
		}
	*/

	const type = Object.keys(query.data)[0];
	const id = query.data[type];

	/*
		need to make :
		task {
			type: "view",
			view: {
				type: unique || shared,
				id,
			},
			passes: {
				functional: true,
				redesign: process.env.DESIGNER_ENABLE
					? JSON.parse(process.env.DESIGNER_ENABLE.toLowerCase())
					: true,
			}
		}
	*/
	const task = {
		type: "view",
		view: {
			type: id.startsWith(`UV_`) ? `unique` : `shared`,
			id,
		},
		passes: {
			functional: true,
			redesign: process.env.DESIGNER_ENABLE
				? JSON.parse(process.env.DESIGNER_ENABLE.toLowerCase())
				: false,
		},
	};
	console.dir({ "debug:server:task:regen:ui": { request, task } });
	await cofounder.system.run({
		id: "WEBAPP:VIEW::GENERATE",
		context: { ...context, project },
		data: {
			...data,
			task,
		},
	});
}

/**
 * Function to iterate a UI component.
 * @param {Object} param0 - The request and data details.
 */
async function _iterateUiComponent({ request, data }) {
	console.dir({ "cofounder:api:server:iterate:ui": "starts" });
	/*
		designer/layoutv1 might be overkill, but its best way to have primitives to retrieve design system docs (if applies)
		
	*/

	/*
		in : {
			project: meta.project,
			query: {
				action: "iterate:ui",
				data: {
					views : {
						[id] : {
							[version] : {
								user : {
									text: editUserText,
									attachments: [], // later, can attach image
								},
								screenshot: { base64: image ? image : false},
								designer: bool
							}
						},
					}
				},
			},
		}),
		}
	*/
	const { project, query } = request;
	const id = Object.keys(query.data.views)[0];
	const version = Object.keys(query.data.views[id])[0];
	const { notes, screenshot, designer } = query.data.views[id][version];

	const task = {
		type: "view",
		view: {
			type: id.startsWith(`UV_`) ? `unique` : `shared`,
			id,
			version,
		},
		iteration: {
			notes, // {text,attachements}
			screenshot, // {base64 : "base64str" || false }
			designer: process.env.DESIGNER_ENABLE
				? JSON.parse(process.env.DESIGNER_ENABLE.toLowerCase()) && designer
					? true
					: false
				: false,
		},
	};
	console.dir({ "debug:server:task:regen:ui": { request, task } });
	await cofounder.system.run({
		id: "WEBAPP:VIEW::ITERATE",
		context: { ...context, project },
		data: {
			...data,
			task,
		},
	});
}
