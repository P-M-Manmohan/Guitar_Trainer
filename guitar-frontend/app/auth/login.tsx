import { Link, router } from "expo-router";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { saveAuthToken } from "../../src/services/auth";
import { apiPost } from "../../src/services/api";

type AuthResponse = { token: string };

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const login = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { token } = await apiPost<AuthResponse>("/auth/login", { email: email.trim(), password });
      await saveAuthToken(token);
      router.replace("/");
    } catch {
      setError("Unable to log in. Check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", backgroundColor: "#121212", padding: 28 }}>
      <Text style={{ color: "white", fontSize: 34, fontWeight: "bold" }}>Welcome back</Text>
      <Text style={{ color: "#BBBBBB", fontSize: 18, marginTop: 10 }}>Log in to continue your guitar practice.</Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#9CA3AF" autoCapitalize="none" keyboardType="email-address" style={{ color: "white", backgroundColor: "#1F2937", borderRadius: 12, padding: 16, marginTop: 30, fontSize: 17 }} />
      <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#9CA3AF" secureTextEntry style={{ color: "white", backgroundColor: "#1F2937", borderRadius: 12, padding: 16, marginTop: 14, fontSize: 17 }} />
      {!!error && <Text style={{ color: "#EF4444", marginTop: 14 }}>{error}</Text>}
      <TouchableOpacity disabled={submitting} onPress={login} style={{ opacity: submitting ? 0.6 : 1, backgroundColor: "#3B82F6", borderRadius: 12, padding: 18, marginTop: 24 }}><Text style={{ color: "white", textAlign: "center", fontSize: 18, fontWeight: "bold" }}>{submitting ? "Logging in..." : "Log In"}</Text></TouchableOpacity>
      <Link href="/auth/signup" style={{ color: "#60A5FA", textAlign: "center", marginTop: 24, fontSize: 16 }}>New here? Create an account</Link>
    </View>
  );
}
