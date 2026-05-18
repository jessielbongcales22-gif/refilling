import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

export interface User {
  id: number;
  username: string;
  email: string;
  role: "admin" | "staff" | "customer";
  phone?: string;
  address?: string;
  created_at?: string;
}

export interface Order {
  id: number;
  user_id?: number | null;
  customer_name: string;
  customerName?: string;
  phone: string;
  address: string;
  quantity: number;
  price_per_container: number;
  pricePerContainer?: number;
  total_amount: number;
  totalAmount?: number;
  order_type?: "online" | "walk_in";
  orderType?: "online" | "walk_in";
  status: string;
  created_at?: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  category?: string;
  quantity: number;
  unit?: string;
  reorder_level?: number;
  reorderLevel?: number;
  created_at?: string;
}

interface DataContextType {
  users: User[];
  orders: Order[];
  inventory: InventoryItem[];
  loading: boolean;
  error: string;

  refreshData: () => Promise<void>;

  addUser: (data: any) => Promise<any>;
  updateUser: (id: number, data: any) => Promise<any>;
  deleteUser: (id: number) => Promise<any>;

  addOrder: (data: any) => Promise<any>;
  createOrder: (data: any) => Promise<any>;
  updateOrder: (id: number, data: any) => Promise<any>;
  updateOrderStatus: (id: number, status: string) => Promise<any>;
  deleteOrder: (id: number) => Promise<any>;

  addInventoryItem: (data: any) => Promise<any>;
  updateInventoryItem: (id: number, data: any) => Promise<any>;
  deleteInventoryItem: (id: number) => Promise<any>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

function normalizeOrder(order: any): Order {
  return {
    ...order,
    customerName: order.customer_name,
    pricePerContainer: Number(order.price_per_container || 30),
    totalAmount: Number(order.total_amount || 0),
    orderType: order.order_type,
    quantity: Number(order.quantity || 1),
    price_per_container: Number(order.price_per_container || 30),
    total_amount: Number(order.total_amount || 0)
  };
}

function normalizeInventory(item: any): InventoryItem {
  return {
    ...item,
    reorderLevel: Number(item.reorder_level || 10),
    quantity: Number(item.quantity || 0)
  };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshData = async () => {
    try {
      setLoading(true);
      setError("");

      const [usersRes, ordersRes, inventoryRes] = await Promise.all([
        axios.get("/api/users"),
        axios.get("/api/orders"),
        axios.get("/api/inventory")
      ]);

      setUsers(usersRes.data.users || []);
      setOrders((ordersRes.data.orders || []).map(normalizeOrder));
      setInventory((inventoryRes.data.items || []).map(normalizeInventory));
    } catch (err: any) {
      console.error("Refresh data error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load data from database."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const addUser = async (data: any) => {
    const payload = {
      username: data.username || data.name || data.fullName,
      email: data.email,
      phone: data.phone || "",
      address: data.address || "",
      password: data.password || "password123",
      role: data.role || "customer"
    };

    const res = await axios.post("/api/users", payload);
    await refreshData();
    return res.data;
  };

  const updateUser = async (id: number, data: any) => {
    const payload = {
      username: data.username || data.name || data.fullName,
      email: data.email,
      phone: data.phone || "",
      address: data.address || "",
      role: data.role || "customer"
    };

    const res = await axios.put(`/api/users/${id}`, payload);
    await refreshData();
    return res.data;
  };

  const deleteUser = async (id: number) => {
    const res = await axios.delete(`/api/users/${id}`);
    await refreshData();
    return res.data;
  };

  const addOrder = async (data: any) => {
    const quantity = Number(data.quantity || 1);
    const price = Number(data.price_per_container || data.pricePerContainer || 30);

    const payload = {
      user_id: data.user_id || data.userId || null,
      customer_name: data.customer_name || data.customerName || data.name,
      phone: data.phone || "",
      address: data.address || "",
      quantity,
      price_per_container: price,
      order_type: data.order_type || data.orderType || "online",
      status: data.status || "pending"
    };

    const res = await axios.post("/api/orders", payload);
    await refreshData();
    return res.data;
  };

  const createOrder = addOrder;

  const updateOrder = async (id: number, data: any) => {
    const quantity = Number(data.quantity || 1);
    const price = Number(data.price_per_container || data.pricePerContainer || 30);

    const payload = {
      customer_name: data.customer_name || data.customerName || data.name,
      phone: data.phone || "",
      address: data.address || "",
      quantity,
      price_per_container: price,
      order_type: data.order_type || data.orderType || "online",
      status: data.status || "pending"
    };

    const res = await axios.put(`/api/orders/${id}`, payload);
    await refreshData();
    return res.data;
  };

  const updateOrderStatus = async (id: number, status: string) => {
    const res = await axios.patch(`/api/orders/${id}/status`, { status });
    await refreshData();
    return res.data;
  };

  const deleteOrder = async (id: number) => {
    const res = await axios.delete(`/api/orders/${id}`);
    await refreshData();
    return res.data;
  };

  const addInventoryItem = async (data: any) => {
    const payload = {
      name: data.name,
      category: data.category || "",
      quantity: Number(data.quantity || 0),
      unit: data.unit || "pcs",
      reorder_level: Number(data.reorder_level || data.reorderLevel || 10)
    };

    const res = await axios.post("/api/inventory", payload);
    await refreshData();
    return res.data;
  };

  const updateInventoryItem = async (id: number, data: any) => {
    const payload = {
      name: data.name,
      category: data.category || "",
      quantity: Number(data.quantity || 0),
      unit: data.unit || "pcs",
      reorder_level: Number(data.reorder_level || data.reorderLevel || 10)
    };

    const res = await axios.put(`/api/inventory/${id}`, payload);
    await refreshData();
    return res.data;
  };

  const deleteInventoryItem = async (id: number) => {
    const res = await axios.delete(`/api/inventory/${id}`);
    await refreshData();
    return res.data;
  };

  return (
    <DataContext.Provider
      value={{
        users,
        orders,
        inventory,
        loading,
        error,
        refreshData,
        addUser,
        updateUser,
        deleteUser,
        addOrder,
        createOrder,
        updateOrder,
        updateOrderStatus,
        deleteOrder,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);

  if (!context) {
    throw new Error("useData must be used inside DataProvider");
  }

  return context;
}
