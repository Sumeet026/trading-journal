import { state, els, showNotification, initAppUI } from "./core.js";

import {
  auth,
  isFirebaseEnabled,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
} from "../firebase.js";

import {
  migrateToUserScopedStorage,
  clearUserScopedStorage,
} from "../storage.js";

let isSignUpMode = true;

function checkAuthSession() {
  if (isFirebaseEnabled) {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        state.user = firebaseUser;
        state.isLocalMode = false;

        migrateToUserScopedStorage();

        if (firebaseUser.emailVerified) {
          showNotification("Successfully authenticated.", "success");
          initAppUI();
        } else {
          showEmailVerifyScreen(firebaseUser.email);
        }
      } else {
        showAuthScreen();
      }
    });
  } else {
    showAuthScreen();
  }
}

function showAuthScreen() {
  els.authOverlay.style.display = "flex";
  els.appMain.style.display = "none";
  els.emailVerifyOverlay.style.display = "none";
  setAuthMode(true);
}

function showEmailVerifyScreen(email) {
  els.authOverlay.style.display = "none";
  els.appMain.style.display = "none";
  els.emailVerifyOverlay.style.display = "flex";
  els.verifyEmailDisplay.textContent = email || "";
  els.verifyStatusMsg.textContent = "";
}

function setAuthMode(signUp) {
  isSignUpMode = signUp;
  if (isSignUpMode) {
    els.authTitle.innerText = "Create Account";
    els.authSubtitle.innerText = "Join thousands of professional traders tracking their growth.";
    els.nameGroup.style.display = "flex";
    els.authSubmitBtn.innerText = "Create Account";
    els.authSwitchText.innerText = "Already have an account?";
    els.authSwitchBtn.innerText = "Log In";
    els.forgotPasswordBtn.style.display = "none";
  } else {
    els.authTitle.innerText = "Welcome Back";
    els.authSubtitle.innerText = "Log in to view your journals and sync with the cloud.";
    els.nameGroup.style.display = "none";
    els.authSubmitBtn.innerText = "Log In";
    els.authSwitchText.innerText = "Don't have an account?";
    els.authSwitchBtn.innerText = "Sign Up";
    els.forgotPasswordBtn.style.display = "inline";
  }
}

function initAuth() {
  els.authSwitchBtn.addEventListener("click", () => {
    setAuthMode(!isSignUpMode);
  });

  els.authForm.addEventListener("submit", async () => {
    const email = els.authEmail.value;
    const password = els.authPassword.value;
    const name = els.authName.value;

    try {
      if (isSignUpMode) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });
        await sendEmailVerification(userCred.user);
        showNotification("Account created! Verification email sent. Please check your inbox.", "success");
        showEmailVerifyScreen(email);
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        if (userCred.user.emailVerified) {
          showNotification("Logged in successfully!", "success");
          els.authOverlay.style.display = "none";
        } else {
          showNotification("Please verify your email first. Check your inbox.", "warning");
          showEmailVerifyScreen(email);
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      showNotification(error.message, "danger");
    }
  });

  els.resendVerifyBtn.addEventListener("click", async () => {
    if (state.user) {
      try {
        await sendEmailVerification(state.user);
        els.verifyStatusMsg.textContent = "Verification email sent! Check your inbox.";
        els.verifyStatusMsg.style.color = "var(--primary)";
        showNotification("Verification email resent!", "success");
      } catch (error) {
        els.verifyStatusMsg.textContent = "Failed to send. Try again later.";
        els.verifyStatusMsg.style.color = "var(--danger)";
      }
    }
  });

  els.checkVerifyBtn.addEventListener("click", async () => {
    if (state.user) {
      try {
        await state.user.reload();
        if (state.user.emailVerified) {
          showNotification("Email verified! Welcome!", "success");
          els.emailVerifyOverlay.style.display = "none";
          initAppUI();
        } else {
          els.verifyStatusMsg.textContent = "Email not verified yet. Check your inbox and click the link.";
          els.verifyStatusMsg.style.color = "var(--warning)";
          showNotification("Email not verified yet.", "warning");
        }
      } catch (error) {
        els.verifyStatusMsg.textContent = "Error checking status. Try again.";
        els.verifyStatusMsg.style.color = "var(--danger)";
      }
    }
  });

  els.logoutFromVerifyBtn.addEventListener("click", async () => {
    clearUserScopedStorage();
    await signOut(auth);
    localStorage.removeItem("tj_local_mode");
    location.reload();
  });

  els.logoutBtn.addEventListener("click", async () => {
    clearUserScopedStorage();
    await signOut(auth);
    localStorage.removeItem("tj_local_mode");
    location.reload();
  });

  els.profileForm.addEventListener("submit", () => {
    const name = els.profileInputName.value;
    localStorage.setItem(`tj_${state.user ? state.user.uid + '_' : ''}user_name`, name);
    els.profileName.innerText = name;
    els.avatarInitial.innerText = name.charAt(0).toUpperCase();
    showNotification("Profile updated successfully (locally).", "success");
  });

  if (els.openAuthModalBtn) {
    els.openAuthModalBtn.addEventListener("click", () => {
      showAuthScreen();
    });
  }
}

export { initAuth, checkAuthSession, setAuthMode, showAuthScreen };
