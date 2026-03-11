import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    ConnectionProvider,
    WalletProvider,
    useWallet,
    useConnection,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

import "@solana/wallet-adapter-react-ui/styles.css";

const RPC_URL = import.meta.env.VITE_RPC_URL || clusterApiUrl("devnet");

// ============================================================================
// Dashboard Component
// ============================================================================
function Dashboard() {
    const { publicKey, connected } = useWallet();
    const { connection } = useConnection();
    const [activeTab, setActiveTab] = useState<"dashboard" | "mint" | "burn" | "blacklist" | "audit">("dashboard");
    const [balance, setBalance] = useState<number | null>(null);
    const [supplyData, setSupplyData] = useState({ totalMinted: "0", totalBurned: "0", netSupply: "0" });
    const [auditLog, setAuditLog] = useState<{ action: string; timestamp: string; details: string }[]>([]);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (publicKey && connection) {
            connection.getBalance(publicKey).then((bal) => setBalance(bal / LAMPORTS_PER_SOL));
        }
    }, [publicKey, connection]);

    const tabs = [
        { id: "dashboard" as const, label: "Dashboard", icon: "📊" },
        { id: "mint" as const, label: "Mint", icon: "🪙" },
        { id: "burn" as const, label: "Burn", icon: "🔥" },
        { id: "blacklist" as const, label: "Blacklist", icon: "🚫" },
        { id: "audit" as const, label: "Audit Log", icon: "📋" },
    ];

    return (
        <div className="min-h-screen bg-surface-950">
            {/* Status Bar */}
            <header className="glass border-b border-white/5 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold gradient-text">SSS Dashboard</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span className={`status-dot ${isPaused ? "bg-red-400" : "bg-green-400"}`} />
                        {isPaused ? "Paused" : "Active"}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {balance !== null && (
                        <span className="text-sm text-gray-400 font-mono">
                            {balance.toFixed(4)} SOL
                        </span>
                    )}
                    <WalletMultiButton className="!bg-primary-600 !rounded-xl !font-semibold !h-10" />
                </div>
            </header>

            <div className="flex">
                {/* Sidebar Navigation */}
                <nav className="w-64 min-h-[calc(100vh-52px)] glass border-r border-white/5 p-4">
                    <div className="space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${activeTab === tab.id
                                        ? "bg-primary-500/20 text-primary-300 border border-primary-500/30"
                                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                <span className="font-medium">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Main Content */}
                <main className="flex-1 p-8">
                    {!connected ? (
                        <div className="flex flex-col items-center justify-center h-96">
                            <div className="card-hover text-center p-12">
                                <h2 className="text-2xl font-bold gradient-text mb-4">
                                    Connect Your Wallet
                                </h2>
                                <p className="text-gray-400 mb-6">
                                    Connect a Solana wallet to manage your stablecoin.
                                </p>
                                <WalletMultiButton className="!bg-primary-600 !rounded-xl !font-semibold" />
                            </div>
                        </div>
                    ) : activeTab === "dashboard" ? (
                        <DashboardView supplyData={supplyData} />
                    ) : activeTab === "mint" ? (
                        <MintForm />
                    ) : activeTab === "burn" ? (
                        <BurnForm />
                    ) : activeTab === "blacklist" ? (
                        <BlacklistPanel />
                    ) : (
                        <AuditLogView entries={auditLog} />
                    )}
                </main>
            </div>
        </div>
    );
}

// ============================================================================
// Dashboard View
// ============================================================================
function DashboardView({ supplyData }: { supplyData: { totalMinted: string; totalBurned: string; netSupply: string } }) {
    const stats = [
        { label: "Total Minted", value: supplyData.totalMinted, color: "text-green-400", icon: "🪙" },
        { label: "Total Burned", value: supplyData.totalBurned, color: "text-red-400", icon: "🔥" },
        { label: "Net Supply", value: supplyData.netSupply, color: "text-primary-400", icon: "📊" },
    ];

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold">Supply Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="card-hover">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl">{stat.icon}</span>
                            <span className="text-sm text-gray-400 font-medium">{stat.label}</span>
                        </div>
                        <p className={`text-3xl font-bold font-mono ${stat.color}`}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Supply Chart Placeholder */}
            <div className="card">
                <h3 className="text-lg font-semibold mb-4">Supply History</h3>
                <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                        <p className="text-6xl mb-4">📈</p>
                        <p>Connect to a mint to view supply history</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Mint Form
// ============================================================================
function MintForm() {
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleMint = async () => {
        setIsLoading(true);
        try {
            // In production, call SDK mintTokens here
            alert(`Minting ${amount} tokens to ${recipient}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-lg space-y-6">
            <h2 className="text-2xl font-bold">Mint Tokens</h2>
            <div className="card space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Recipient Address</label>
                    <input
                        type="text"
                        className="input-field font-mono"
                        placeholder="Enter wallet address..."
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                    <input
                        type="number"
                        className="input-field"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                <button
                    className="btn-primary w-full"
                    onClick={handleMint}
                    disabled={!recipient || !amount || isLoading}
                >
                    {isLoading ? "Minting..." : "Mint Tokens"}
                </button>
            </div>
        </div>
    );
}

// ============================================================================
// Burn Form
// ============================================================================
function BurnForm() {
    const [amount, setAmount] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleBurn = async () => {
        setIsLoading(true);
        try {
            alert(`Burning ${amount} tokens`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-lg space-y-6">
            <h2 className="text-2xl font-bold">Burn Tokens</h2>
            <div className="card space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Amount to Burn</label>
                    <input
                        type="number"
                        className="input-field"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                <button
                    className="btn-danger w-full"
                    onClick={handleBurn}
                    disabled={!amount || isLoading}
                >
                    {isLoading ? "Burning..." : "🔥 Burn Tokens"}
                </button>
            </div>
        </div>
    );
}

// ============================================================================
// Blacklist Panel
// ============================================================================
function BlacklistPanel() {
    const [target, setTarget] = useState("");
    const [reason, setReason] = useState("");
    const [entries, setEntries] = useState<{ address: string; reason: string; date: string }[]>([]);

    const handleAdd = async () => {
        setEntries([...entries, { address: target, reason, date: new Date().toISOString() }]);
        setTarget("");
        setReason("");
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Blacklist Management</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card space-y-4">
                    <h3 className="text-lg font-semibold">Add to Blacklist</h3>
                    <input
                        type="text"
                        className="input-field font-mono"
                        placeholder="Wallet address..."
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                    />
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Reason for blacklisting..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                    <button className="btn-danger w-full" onClick={handleAdd} disabled={!target || !reason}>
                        🚫 Add to Blacklist
                    </button>
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Blacklisted Addresses</h3>
                    {entries.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No blacklisted addresses</p>
                    ) : (
                        <div className="space-y-2">
                            {entries.map((e, i) => (
                                <div key={i} className="bg-surface-800/50 rounded-lg p-3">
                                    <p className="font-mono text-sm text-red-400 truncate">{e.address}</p>
                                    <p className="text-xs text-gray-500 mt-1">{e.reason}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Audit Log View
// ============================================================================
function AuditLogView({ entries }: { entries: { action: string; timestamp: string; details: string }[] }) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Audit Log</h2>
            <div className="card">
                {entries.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p className="text-4xl mb-3">📋</p>
                        <p>No audit events recorded yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {entries.map((entry, i) => (
                            <div key={i} className="py-3 flex justify-between items-start">
                                <div>
                                    <p className="font-medium">{entry.action}</p>
                                    <p className="text-sm text-gray-500">{entry.details}</p>
                                </div>
                                <span className="text-xs text-gray-600 font-mono">{entry.timestamp}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// App Root (Wallet Provider Wrapper)
// ============================================================================
export default function App() {
    const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

    return (
        <ConnectionProvider endpoint={RPC_URL}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <Dashboard />
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}
