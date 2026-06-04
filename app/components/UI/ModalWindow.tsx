import { Modal, View, TouchableOpacity, Text, StyleSheet } from "react-native";

interface PopWindowProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function ModalWindow({
  visible,
  onClose,
  children,
}: PopWindowProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.window}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>

          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  window: {
    width: "80%",
    height: "90%",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 25,
  },
  closeButton: {
    position: "absolute",
    right: 20,
    top: 20,
    zIndex: 100,
    alignSelf: "center",
    backgroundColor: "red",
    paddingVertical: 1,
    paddingHorizontal: 8,
    borderRadius: 8
  },
  closeText: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#fff",
  },
});