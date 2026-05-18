app.post("/api/login", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const loginValue = email || username;

    if (!loginValue || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/username and password are required"
      });
    }

    const db = getPool();

    const [users] = await db.execute(
      "SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1",
      [loginValue, loginValue]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials. User not found."
      });
    }

    const user = users[0];

    let isPasswordCorrect = false;

    // Check if password_hash is already bcrypt encrypted
    if (
      user.password_hash &&
      (user.password_hash.startsWith("$2a$") ||
        user.password_hash.startsWith("$2b$") ||
        user.password_hash.startsWith("$2y$"))
    ) {
      isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
    } else {
      // Allow old/plain-text passwords like admin123
      isPasswordCorrect = password === user.password_hash;

      // If plain-text password is correct, convert it to bcrypt hash
      if (isPasswordCorrect) {
        const newHash = await bcrypt.hash(password, 10);

        await db.execute(
          "UPDATE users SET password_hash = ? WHERE id = ?",
          [newHash, user.id]
        );

        console.log(`Password for ${user.email} converted to bcrypt hash.`);
      }
    }

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials. Wrong password."
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || "water-market-secret-key",
      {
        expiresIn: "1d"
      }
    );

    await db.execute(
      "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
      [user.id, "LOGIN", "User logged in"]
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: `Server error during login: ${error.message}`
    });
  }
});
