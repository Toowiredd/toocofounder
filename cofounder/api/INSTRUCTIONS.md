# CoFounder modification instructions for Copilot

## Project context

This project is a modification of the CoFounder open-source software. The goal is to integrate self-hosted micro language models (or utilize OpenRouter/Replicate AI API alternatives) for enhanced functionality.

## Development environment

* **Local:** Laptop with an NVIDIA GeForce RTX GPU (utilized for GPU-intensive tasks like fine-tuning or inference).
* **Remote:** VPS with 12 Intel Silver vCPUs, 64GB RAM, and a 1.2TB NVMe hard drive (primary code execution environment).

## Code generation guidelines

* **Language:** Python
* **Style:** Adhere to the CoFounder project's coding style and conventions.
* **Efficiency:** Prioritize code readability, maintainability, and efficiency, considering the resource constraints of the VPS.
* **Integration:** Seamlessly integrate micro LLMs (or OpenRouter/Replicate AI alternatives) into CoFounder's architecture.
* **GPU utilization:** Leverage the laptop's NVIDIA GPU for tasks where it offers a performance advantage.
* **Documentation:** Include clear explanations and documentation within the code to clarify implementation choices.
* **Resource optimization:** Optimize resource utilization across the VPS and laptop, considering the computational demands of LLMs.
* **Modularity:** Generate modular and well-tested code that is compatible with CoFounder's existing functionalities.

## Specific instructions

* When generating code for computationally intensive LLM tasks, provide solutions that utilize the laptop's GPU.
* If a suitable micro LLM is not available, offer alternatives using OpenRouter or Replicate AI's API.
* Ensure all code changes are accompanied by comprehensive unit tests.
* Prioritize solutions that minimize latency and maximize throughput, given the remote VPS setup.
