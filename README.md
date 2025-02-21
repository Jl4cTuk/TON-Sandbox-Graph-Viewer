# TON Graph Viewer

> Dark mode is here, and it looks great!

## Usage

Include the script in your tests folder inside your blueprint project:

`import { generateGraph } from './generateGraph';`

Call the function in your test after executing transactions:

`generateGraph(res.transactions, "name" or null, addressBook);`

The script will generate a .json file with all actions and interactions.

Load the JSON in the TON Graph Viewer to analyze contract behaviors visually.

## Examples

1) Full Address Rendering

```ts
const deployResult = await addressBook.send(
    deployer.getSender(),
    { value: toNano('0.05') },
    { $$type: 'Deploy', queryId: 0n }
);
    
generateGraph(deployResult.transactions, "beforeAll");
```

---

2) Custom Named Nodes with Address Book

```ts
const res = await contract.send(
    someone.getSender(), 
    { value: toNano("0.6") }, 
    "owner"
);

const addressBook = {
    "deployer": deployer.address!!.toString(),
    "someone": someone.address!!.toString(),
    "contract": contract.address!!.toString()
};

generateGraph(res.transactions, null, addressBook);
```

## Installation & Setup

Set up the environment variable:

`export TON_GRAPH_PATH=$HOME/.local/share/graphs`

Then build and run using Docker:

`docker compose up -d --build`

Viewer will be available at http://localhost:5000

## TODO

- Configurable node highlighting on custom rules
- Hooking common opcodes
- Smart body parsing