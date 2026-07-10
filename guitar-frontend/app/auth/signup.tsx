import { Link, router } from "expo-router";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { saveAuthToken } from "../../src/services/auth";
import { apiPost } from "../../src/services/api";

type AuthResponse = { token: string };

export default function SignupScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const signup = async () => {
    if (!username.trim() || !email.trim() || !password) {
      setError("Enter a username, email, and password.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { token } = await apiPost<AuthResponse>("/auth/signup", { username: username.trim(), email: email.trim(), password });
      await saveAuthToken(token);
      router.replace("/");
    } catch {
      setError("Unable to create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", backgroundColor: "#121212", padding: 28 }}>
      <Text style={{ color: "white", fontSize: 34, fontWeight: "bold" }}>Start practicing</Text>
      <Text style={{ color: "#BBBBBB", fontSize: 18, marginTop: 10 }}>Create your Guitar Trainer account.</Text>
      <TextInput value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor="#9CA3AF" style={{ color: "white", backgroundColor: "#1F2937", borderRadius: 12, padding: 16, marginTop: 30, fontSize: 17 }} />
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#9CA3AF" autoCapitalize="none" keyboardType="email-address" style={{ color: "white", backgroundColor: "#1F2937", borderRadius: 12, padding: 16, marginTop: 14, fontSize: 17 }} />
      <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#9CA3AF" secureTextEntry style={{ color: "white", backgroundColor: "#1F2937", borderRadius: 12, padding: 16, marginTop: 14, fontSize: 17 }} />
      {!!error && <Text style={{ color: "#EF4444", marginTop: 14 }}>{error}</Text>}
      <TouchableOpacity disabled={submitting} onPress={signup} style={{ opacity: submitting ? 0.6 : 1, backgroundColor: "#3B82F6", borderRadius: 12, padding: 18, marginTop: 24 }}><Text style={{ color: "white", textAlign: "center", fontSize: 18, fontWeight: "bold" }}>{submitting ? "Creating account..." : "Sign Up"}</Text></TouchableOpacity>
      <Link href="/auth/login" style={{ color: "#60A5FA", textAlign: "center", marginTop: 24, fontSize: 16 }}>Already have an account? Log in</Link>
    </View>
  );
}
