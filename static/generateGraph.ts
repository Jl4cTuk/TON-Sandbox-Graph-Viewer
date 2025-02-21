import path from "path";
import fs from "fs";
import { flattenTransaction } from "@ton/test-utils";
import { AccountStatus, Message, Transaction } from "@ton/core";

export type FlatTransactionSimplified = {
  from?: string;
  to?: string;
  on?: string;
  value?: string;
  body?: string;
  inMessageBounced?: boolean;
  inMessageBounceable?: boolean;
  op?: string;
  deploy: boolean;
  lt: string;
  now: number;
  outMessagesCount: number;
  oldStatus: AccountStatus;
  endStatus: AccountStatus;
  totalFees?: string;
  aborted?: boolean;
  destroyed?: boolean;
  exitCode?: number;
  actionResultCode?: number;
  success?: boolean;
  change?: string;
};

export type AddressBook = { [key: string]: string };

type TransactionLink = {
  src: Transaction;
  dst: Transaction;
};

function simplifyFlatTransaction(t: Transaction): FlatTransactionSimplified {
  const transaction = flattenTransaction(t);

  let sumIn = 0n;
  let sumOut = 0n;

  if (t.inMessage?.info.type === "internal") {
    sumIn += t.inMessage.info.value.coins;
  }
  for (const outMsg of t.outMessages.values()) {
    if (outMsg.info.type === "internal") {
      sumOut += outMsg.info.value.coins;
    }
  }

  sumOut += t.totalFees.coins;

  return {
    from: transaction.from?.toString(),
    to: transaction.to?.toString(),
    on: transaction.on?.toString(),
    value: transaction.value?.toString(),
    body: transaction.body?.toBoc().toString("hex"),
    inMessageBounced: transaction.inMessageBounced,
    inMessageBounceable: transaction.inMessageBounceable,
    op: transaction.op?.toString(16),
    deploy: transaction.deploy,
    lt: transaction.lt.toString(),
    now: transaction.now,
    outMessagesCount: transaction.outMessagesCount,
    oldStatus: transaction.oldStatus,
    endStatus: transaction.endStatus,
    totalFees: transaction.totalFees?.toString(),
    aborted: transaction.aborted,
    destroyed: transaction.destroyed,
    exitCode: transaction.exitCode,
    actionResultCode: transaction.actionResultCode,
    success: transaction.success,
    change: (sumIn - sumOut).toString(),
  };
}

function areMessagesEqual(msg1: Message, msg2: Message): boolean {
  if (!msg1 || !msg2) return false;
  if (msg1.info.type !== "internal" || msg2.info.type !== "internal") return false;

  const info1 = msg1.info;
  const info2 = msg2.info;

  return (
    info1.src.equals(info2.src) &&
    info1.dest.equals(info2.dest) &&
    info1.createdLt === info2.createdLt &&
    info1.createdAt === info2.createdAt &&
    msg1.body.hash().equals(msg2.body.hash())
  );
}

function linkTransactions(transactions: Transaction[]): TransactionLink[] {
  const links: TransactionLink[] = [];

  transactions.forEach((dstTransaction) => {
    const inMessage = dstTransaction.inMessage;
    if (!inMessage) return;

    transactions.forEach((srcTransaction) => {
      if (srcTransaction === dstTransaction) return;

      for (const outMsg of srcTransaction.outMessages.values()) {
        if (areMessagesEqual(outMsg, inMessage)) {
          links.push({ src: srcTransaction, dst: dstTransaction });
          break;
        }
      }
    });
  });

  return links;
}

function prepareGraphDataCytoscape(
  transactionLinks: TransactionLink[],
  addressBook?: AddressBook | null
) {
  const elements: any[] = [];
  const nodeSet = new Set<string>();

  for (const { src, dst } of transactionLinks) {
    const srcFlattened = flattenTransaction(src);
    const dstFlattened = flattenTransaction(dst);
    const srcId = src.lt.toString();
    const dstId = dst.lt.toString();

    function resolveLabel(address?: string) {
      if (!address) return "external";
      if (!addressBook) return address;
      return Object.entries(addressBook).find(([_, val]) => val === address)?.[0] || address;
    }

    if (!nodeSet.has(srcId)) {
      const label = resolveLabel(srcFlattened.on?.toString());
      elements.push({ data: { id: srcId, label, keys: simplifyFlatTransaction(src) } });
      nodeSet.add(srcId);

      if (src.inMessage?.info.type === "external-in") {
        if (!nodeSet.has("0")) {
          elements.push({ data: { id: "0", label: "external" } });
          nodeSet.add("0");
        }
        elements.push({ data: { source: "0", target: srcId } });
      }
    }

    if (!nodeSet.has(dstId)) {
      const label = resolveLabel(dstFlattened.on?.toString());
      elements.push({ data: { id: dstId, label, keys: simplifyFlatTransaction(dst) } });
      nodeSet.add(dstId);
    }

    elements.push({ data: { source: srcId, target: dstId } });
  }

  return elements;
}

export function generateGraph(
  transactions: Transaction[],
  name?: string | null,
  addressBook?: AddressBook | null
) {

  const linked = linkTransactions(transactions);
  const elements = prepareGraphDataCytoscape(linked, addressBook);

  const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
  const fileBase = name || `graph-${timestamp}`;
  const fileName = `${fileBase}.json`;

  const graphsDir = process.env.TON_GRAPH_PATH || "~/.local/share/graphs";

  if (!fs.existsSync(graphsDir)) {
    fs.mkdirSync(graphsDir, { recursive: true });
  }

  const filePath = path.join(graphsDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(elements, null, 2), "utf-8");
}
