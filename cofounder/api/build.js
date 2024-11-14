import fs from "fs";
import path from "path";
import yaml from "yaml-js";
import yml from "yaml";
import { merge, fromPairs } from "lodash-es";
import retry from "async-retry";
import pqueue from "p-queue";
import { EventEmitter } from "node:events";
import { promisify } from "util";
import { readdir } from "fs";
import delay from "delay";

// The build function initializes the system by setting up nodes, functions, sequences, and event handlers.
async function build({ system }) {
	console.dir({ build: system.functions });

	if (!system.nodes) system.nodes = {};
	if (!system.functions) system.functions = {};
	if (!system.sequences) system.sequences = {};

	const queues = {};
	const events = {
		main: new EventEmitter(),
		log: {
			node: new EventEmitter(),
			sequence: new EventEmitter(),
		},
	};

	if (LOGS_ENABLED) {
		events.log.node.on(`enqueue`, ({ id, context, data }) => {
			console.log(
				`\x1b[36mlog:enqueue:  node:${id}\t${JSON.stringify({ context, data }).slice(0, 150)}\x1b[0m`,
			);
		});
		events.log.node.on(`start`, ({ id, context, data }) => {
			console.log(
				`\x1b[33mlog:start:    node:${id}\t${JSON.stringify({ context, data }).slice(0, 150)}\x1b[0m`,
			);
		});
		events.log.node.on(`end`, ({ id, context, data, response }) => {
			console.log(
				`\x1b[32mlog:complete: node:${id}\t${JSON.stringify({ context, response, data }).slice(0, 150)}\x1b[0m`,
			);
		});
	}

	// The system.run function executes a node by its ID with the given context and data.
	system.run = async ({ id, context, data }) => {
		try {
			return await system.nodes[id].run({ context, data });
		} catch (err) {
			console.dir({ SYSTEM_RUN_ERR: { err, id } });
			throw err; // Re-throw the error to ensure it's not silently ignored
		}
	};

	events.main.on(`run`, async ({ id, context, data }) => {
		if (LOGS_ENABLED) {
			console.log(`\x1b[31mevent:\`run\` →id:${id}\x1b[0m`);
		}
		await system.run({ id, context, data });
	});

	// Initialize nodes with their respective functions and set up queues for concurrency control.
	system.nodes = fromPairs(
		await Promise.all(
			Object.keys(system.functions)
				.filter((id) => Object.keys(system.nodes).includes(id))
				.map(async (id) => {
					queues[id] = new pqueue({
						concurrency: parseInt(system.nodes[id].queue?.concurrency) || Infinity,
						intervalCap:
							parseInt(system.nodes[id].queue?.interval?.limit) || Infinity,
						interval: parseInt(system.nodes[id].queue?.interval?.time) || 0,
						timeout: parseInt(system.nodes[id].queue?.timeout) || undefined,
					});
					// This is the function to be run for each node.
					const fn = async ({ context = {}, data = {} }) => {
						events.log.node.emit(`enqueue`, { id, context, data });
						return await queues[id].add(async () => {
							events.log.node.emit(`start`, { id, context, data });
							const response = await retry(
								async (bail) => {
									try {
										const fnresponse = await system.functions[id]({
											context: { ...context, run: system.run },
											data: system.nodes[id].in?.length
												? system.nodes[id].in.reduce(
														(acc, inp) => ({ ...acc, [inp]: data[inp] || null }),
														{},
													) // higher perf than fromPairs ?
												: data,
										});

										return !fnresponse
											? { success: false }
											: system.nodes[id].out?.length
												? system.nodes[id].out.reduce(
														(acc, inp) => ({ ...acc, [inp]: fnresponse[inp] || null }),
														{},
													)
												: fnresponse;
									} catch (error) {
										console.dir({ asyncretry_error: { id, error } }, { depth: null });
										throw new Error(error);
									}
								},
								{
									retries: parseInt(system.nodes[id].queue?.retry) || 5,
								},
							);
							events.log.node.emit(`end`, { id, context, data, response });
							return response;
						});
					};

					return [
						id,
						{
							type: `node`,
							meta: system.nodes[id],
							run: fn,
						}, // to have same format as sequence : system.sequences[id].run and system.functions[id].run
					];
				}),
		),
	);

	// Function to create Directed Acyclic Graphs (DAGs) for sequences.
	async function makeDags() {
		// need to implement recursion cases next !
		return fromPairs(
			Object.keys(system.sequences).map((sequenceId) => {
				const inDegree = {},
					adjList = {};
				const seq = system.sequences[sequenceId];
				const dag = fromPairs(
					system.sequences[sequenceId].nodes.map((nodeId) => {
						return [
							nodeId,
							{
								parents: !seq.relations?.parents
									? []
									: !seq.relations?.parents[nodeId]?.length
										? []
										: seq.relations.parents[nodeId],
							},
						];
					}),
				);
				Object.keys(dag).forEach((node) => {
					inDegree[node] = 0;
					adjList[node] = [];
				});
				Object.entries(dag).forEach(([node, { parents }]) => {
					if (parents) {
						parents.forEach((parent) => {
							if (!adjList[parent]) {
								console.error(
									`build:DAG : parent node ${parent} of node ${node} not found in DAG - skipping dependency`,
								);
							} else {
								adjList[parent].push(node);
								inDegree[node]++;
							}
						});
					}
				});
				const queue = Object.keys(inDegree).filter((node) => inDegree[node] === 0);
				const sequence = [],
					visitedNodes = new Set();
				while (queue.length) {
					const currentLevel = queue.splice(0, queue.length);
					currentLevel.forEach((node) => {
						visitedNodes.add(node);
						adjList[node].forEach((neighbor) => {
							if (--inDegree[neighbor] === 0) queue.push(neighbor);
						});
					});
					sequence.push(currentLevel);
				}
				if (visitedNodes.size !== Object.keys(dag).length) {
					console.dir({ dag, visitedNodes }, { depth: null });
					throw new Error("The provided DAG has cycles or unresolved dependencies");
				}

				// Function to run a sequence of nodes based on the DAG.
				const run = async ({ context, data }) => {
					events.log.sequence.emit(`sequence:start`, {
						id: sequenceId,
						context,
						data,
					});
					const sequenceLength = sequence.length;
					if (context.sequence) {
						console.dir({ "debug:build:context:sequence": context.sequence });
					}
					const resume_at = context?.sequence?.resume ? context.sequence.resume : 0;
					let step_index = -1;
					for (const s of sequence.entries()) {
						step_index++;
						if (step_index >= resume_at) {
							const [index, step] = s;
							events.log.sequence.emit(`sequence:step:start`, {
								id: sequenceId,
								index,
								over: sequenceLength,
								context,
								data,
							});
							await Promise.all(
								step.map(async (parallelfnId) => {
									const response = await system.run({
										id: parallelfnId,
										context: { ...context, run: system.run },
										data,
									});
									data = merge(data, response);
								}),
							);
							events.log.sequence.emit(`sequence:step:end`, {
								id: sequenceId,
								index,
								over: sequenceLength,
								context,
								data,
							});
						}
					}
					events.log.sequence.emit(`sequence:end`, {
						id: sequenceId,
						context,
						data,
					});
					return data;
				};
				if (system.sequences[sequenceId].triggers?.length) {
					system.sequences[sequenceId].triggers.map((triggerevent) => {
						events.main.on(triggerevent, async ({ context, data }) => {
							if (LOGS_ENABLED) {
								console.log(
									`\x1b[31mevent:\`${triggerevent}\` →sequence:${sequenceId}\x1b[0m`,
								);
							}
							await run({ context, data });
						});
					});
				}
				return [
					sequenceId,
					{
						type: `sequence`,
						meta: {
							...system.sequences[sequenceId],
							dag: sequence,
						},
						run,
					},
				];
			}),
		);
	}
	system.nodes = {
		...system.nodes,
		...(await makeDags()),
	};

	system.queues = queues;
	system.events = {
		events,
		new: async ({ event, context = {}, data = {} }) => {
			events.main.emit(event, { context, data });
		}, // trigger events
		run: async ({ id = false, context = {}, data = {} }) => {
			events.main.emit(`run`, { id, context, data });
		}, // run node/seq events
	};

	return system;
}

// Promisify readdir to use async/await.
const readdirAsync = promisify(readdir);

// Function to get all files recursively with a specific extension.
async function getFilesRecursively(dir, ext) {
	let results = [];
	const list = await readdirAsync(dir, { withFileTypes: true });
	for (const file of list) {
		const filePath = path.join(dir, file.name);
		if (file.isDirectory()) {
			results = results.concat(await getFilesRecursively(filePath, ext));
		} else if (file.name.endsWith(ext)) {
			results.push(filePath);
		}
	}
	return results;
}

// Build the system by loading functions and units from the specified directories.
const system = await build({
	system: {
		functions: merge(
			{},
			...(await Promise.all(
				(await getFilesRecursively(functionsDir, ".js")).map((file) =>
					import(`./${file}`).then((m) => m.default),
				),
			)),
		),
		...merge(
			{},
			...(await Promise.all(
				(await getFilesRecursively(unitsDir, ".yaml")).map((file) =>
					yaml.load(fs.readFileSync(`./${file}`, `utf-8`).toString()),
				),
			)),
		),
	},
});

export default {
	system,
};
