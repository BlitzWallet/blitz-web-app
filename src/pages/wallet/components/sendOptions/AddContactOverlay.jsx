import { motion, AnimatePresence } from "framer-motion";
import AddContactsModal from "../../../contacts/components/addContactsHalfModal/addContactsHalfModal";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";

export default function AddContactOverlay({
  visible,
  onClose,
  onNavigateAway,
}) {
  const { theme, darkModeType } = useThemeContext();
  const { backgroundOffset, backgroundColor } = useThemeColors();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          style={{
            backgroundColor:
              theme && darkModeType ? backgroundOffset : backgroundColor,
          }}
          className="addContactOverlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <AddContactsModal
            onClose={onClose}
            onNavigateAway={onNavigateAway}
            params={{}}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
