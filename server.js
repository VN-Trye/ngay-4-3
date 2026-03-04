const express = require("express");
const { dataRole: _dataRole, dataUser: _dataUser } = require("./data2");

const app = express();
const PORT = 3000;

app.use(express.json());

// Load data (dùng let để có thể chỉnh sửa trong runtime)
let dataRole = [..._dataRole];
let dataUser = [..._dataUser];

// ==================== HELPER ====================

const now = () => new Date().toISOString();

// ==================== ROLE ROUTES ====================

// GET /roles — Lấy tất cả roles
app.get("/roles", (req, res) => {
    res.json(dataRole);
});

// GET /roles/:id — Lấy role theo id
app.get("/roles/:id", (req, res) => {
    const role = dataRole.find((r) => r.id === req.params.id);
    if (!role) return res.status(404).json({ message: "Không tìm thấy role" });
    res.json(role);
});

// GET /roles/:id/users — Lấy tất cả users trong role
app.get("/roles/:id/users", (req, res) => {
    const role = dataRole.find((r) => r.id === req.params.id);
    if (!role) return res.status(404).json({ message: "Không tìm thấy role" });

    const users = dataUser.filter((u) => u.role.id === req.params.id);
    res.json({
        role,
        totalUsers: users.length,
        users,
    });
});

// POST /roles — Tạo role mới
app.post("/roles", (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Thiếu trường name" });

    const newRole = {
        id: "r" + (dataRole.length + 1),
        name,
        description: description || "",
        creationAt: now(),
        updatedAt: now(),
    };
    dataRole.push(newRole);
    res.status(201).json(newRole);
});

// PUT /roles/:id — Cập nhật toàn bộ role
app.put("/roles/:id", (req, res) => {
    const index = dataRole.findIndex((r) => r.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: "Không tìm thấy role" });

    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Thiếu trường name" });

    dataRole[index] = {
        ...dataRole[index],
        name,
        description: description !== undefined ? description : dataRole[index].description,
        updatedAt: now(),
    };

    // Đồng bộ role trong tất cả user liên quan
    dataUser = dataUser.map((u) => {
        if (u.role.id === req.params.id) {
            return {
                ...u,
                role: {
                    id: req.params.id,
                    name: dataRole[index].name,
                    description: dataRole[index].description,
                },
                updatedAt: now(),
            };
        }
        return u;
    });

    res.json(dataRole[index]);
});

// PATCH /roles/:id — Cập nhật một phần role
app.patch("/roles/:id", (req, res) => {
    const index = dataRole.findIndex((r) => r.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: "Không tìm thấy role" });

    const { name, description } = req.body;
    if (name !== undefined) dataRole[index].name = name;
    if (description !== undefined) dataRole[index].description = description;
    dataRole[index].updatedAt = now();

    // Đồng bộ role trong tất cả user liên quan
    dataUser = dataUser.map((u) => {
        if (u.role.id === req.params.id) {
            return {
                ...u,
                role: {
                    id: req.params.id,
                    name: dataRole[index].name,
                    description: dataRole[index].description,
                },
                updatedAt: now(),
            };
        }
        return u;
    });

    res.json(dataRole[index]);
});

// DELETE /roles/:id — Xoá role
app.delete("/roles/:id", (req, res) => {
    const index = dataRole.findIndex((r) => r.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: "Không tìm thấy role" });

    const usersWithRole = dataUser.filter((u) => u.role.id === req.params.id);
    if (usersWithRole.length > 0) {
        return res.status(400).json({
            message: `Không thể xoá: có ${usersWithRole.length} user đang dùng role này`,
        });
    }

    const deleted = dataRole.splice(index, 1)[0];
    res.json({ message: "Xoá thành công", deleted });
});

// ==================== USER ROUTES ====================

// GET /users — Lấy tất cả users
app.get("/users", (req, res) => {
    res.json(dataUser);
});

// GET /users/:username — Lấy user theo username
app.get("/users/:username", (req, res) => {
    const user = dataUser.find((u) => u.username === req.params.username);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    res.json(user);
});

// POST /users — Tạo user mới
app.post("/users", (req, res) => {
    const { username, password, email, fullName, avatarUrl, status, roleId } = req.body;

    if (!username || !password || !email || !fullName) {
        return res.status(400).json({
            message: "Thiếu các trường bắt buộc: username, password, email, fullName",
        });
    }

    if (dataUser.find((u) => u.username === username)) {
        return res.status(409).json({ message: "Username đã tồn tại" });
    }
    if (dataUser.find((u) => u.email === email)) {
        return res.status(409).json({ message: "Email đã tồn tại" });
    }

    const role = dataRole.find((r) => r.id === (roleId || "r3"));
    if (!role) return res.status(400).json({ message: "roleId không hợp lệ" });

    const newUser = {
        username,
        password,
        email,
        fullName,
        avatarUrl: avatarUrl || "https://i.sstatic.net/l60Hf.png",
        status: status !== undefined ? status : true,
        loginCount: 0,
        role: { id: role.id, name: role.name, description: role.description },
        creationAt: now(),
        updatedAt: now(),
    };

    dataUser.push(newUser);
    res.status(201).json(newUser);
});

// PUT /users/:username — Cập nhật toàn bộ user
app.put("/users/:username", (req, res) => {
    const index = dataUser.findIndex((u) => u.username === req.params.username);
    if (index === -1) return res.status(404).json({ message: "Không tìm thấy user" });

    const { password, email, fullName, avatarUrl, status, roleId } = req.body;
    if (!password || !email || !fullName) {
        return res.status(400).json({
            message: "Thiếu các trường bắt buộc: password, email, fullName",
        });
    }

    let role = dataUser[index].role;
    if (roleId) {
        const foundRole = dataRole.find((r) => r.id === roleId);
        if (!foundRole) return res.status(400).json({ message: "roleId không hợp lệ" });
        role = { id: foundRole.id, name: foundRole.name, description: foundRole.description };
    }

    dataUser[index] = {
        ...dataUser[index],
        password,
        email,
        fullName,
        avatarUrl: avatarUrl || dataUser[index].avatarUrl,
        status: status !== undefined ? status : dataUser[index].status,
        role,
        updatedAt: now(),
    };

    res.json(dataUser[index]);
});

// PATCH /users/:username — Cập nhật một phần user
app.patch("/users/:username", (req, res) => {
    const index = dataUser.findIndex((u) => u.username === req.params.username);
    if (index === -1) return res.status(404).json({ message: "Không tìm thấy user" });

    const { password, email, fullName, avatarUrl, status, roleId } = req.body;

    if (password !== undefined) dataUser[index].password = password;
    if (email !== undefined) dataUser[index].email = email;
    if (fullName !== undefined) dataUser[index].fullName = fullName;
    if (avatarUrl !== undefined) dataUser[index].avatarUrl = avatarUrl;
    if (status !== undefined) dataUser[index].status = status;

    if (roleId !== undefined) {
        const foundRole = dataRole.find((r) => r.id === roleId);
        if (!foundRole) return res.status(400).json({ message: "roleId không hợp lệ" });
        dataUser[index].role = {
            id: foundRole.id,
            name: foundRole.name,
            description: foundRole.description,
        };
    }

    dataUser[index].updatedAt = now();
    res.json(dataUser[index]);
});

// DELETE /users/:username — Xoá user
app.delete("/users/:username", (req, res) => {
    const index = dataUser.findIndex((u) => u.username === req.params.username);
    if (index === -1) return res.status(404).json({ message: "Không tìm thấy user" });

    const deleted = dataUser.splice(index, 1)[0];
    res.json({ message: "Xoá thành công", deleted });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
    console.log("");
    console.log("📋 ROLE endpoints:");
    console.log(`   GET    http://localhost:${PORT}/roles`);
    console.log(`   GET    http://localhost:${PORT}/roles/:id`);
    console.log(`   GET    http://localhost:${PORT}/roles/:id/users`);
    console.log(`   POST   http://localhost:${PORT}/roles`);
    console.log(`   PUT    http://localhost:${PORT}/roles/:id`);
    console.log(`   PATCH  http://localhost:${PORT}/roles/:id`);
    console.log(`   DELETE http://localhost:${PORT}/roles/:id`);
    console.log("");
    console.log("👤 USER endpoints:");
    console.log(`   GET    http://localhost:${PORT}/users`);
    console.log(`   GET    http://localhost:${PORT}/users/:username`);
    console.log(`   POST   http://localhost:${PORT}/users`);
    console.log(`   PUT    http://localhost:${PORT}/users/:username`);
    console.log(`   PATCH  http://localhost:${PORT}/users/:username`);
    console.log(`   DELETE http://localhost:${PORT}/users/:username`);
});
