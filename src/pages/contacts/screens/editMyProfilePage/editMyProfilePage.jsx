import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useGlobalContacts } from "../../../../contexts/globalContacts";
import BackArrow from "../../../../components/backArrow/backArrow";
import { useKeysContext } from "../../../../contexts/keysContext";
import { useImageCache } from "../../../../contexts/imageCacheContext";
import { useEffect, useRef, useState } from "react";
import FullLoadingScreen from "../../../../components/fullLoadingScreen/fullLoadingScreen";
import ThemeText from "../../../../components/themeText/themeText";
import CustomButton from "../../../../components/customButton/customButton";
import { isValidUniqueName } from "../../../../../db";
import { encryptMessage } from "../../../../functions/encodingAndDecoding";
import "./style.css";
import ContactProfileImage from "../../components/profileImage/profileImage";
import { Colors } from "../../../../constants/theme";
import CustomInput from "../../../../components/customInput/customInput";
import { VALID_USERNAME_REGEX } from "../../../../constants";
import { useThemeContext } from "../../../../contexts/themeContext";
import useThemeColors from "../../../../hooks/useThemeColors";
import { ImagesIconDark, xSmallIconBlack } from "../../../../constants/icons";
import { useOverlay } from "../../../../contexts/overlayContext";
import CustomSettingsNavbar from "../../../../components/customSettingsNavbar";
import { Image, Trash, X } from "lucide-react";
import SafeAreaComponent from "../../../../components/safeAreaContainer";
import { useProfileImage } from "../../utils/useProfileImage";
import { EditProfileTextInput } from "../../components/EditProfileTextInput/EditProfileTextInput";
import { areImagesSame } from "../../utils/imageComparison";

export default function EditMyProfilePage({ navProps }) {
  const { openOverlay } = useOverlay();
  const navigate = useNavigate();
  const {
    decodedAddedContacts,
    toggleGlobalContactsInformation,
    globalContactsInformation,
    deleteContact,
  } = useGlobalContacts();
  const { t } = useTranslation();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const wantsToDeleteAccount = queryParams.get("confirmed");

  const props = { ...location.state, ...navProps };
  const pageType = props?.pageType || props.route?.params?.pageType;
  const fromSettings = props.fromSettings || props.route?.params?.fromSettings;
  const hideProfileImage = props?.hideProfileImage;
  const isEditingMyProfile = pageType.toLowerCase() === "myprofile";
  const providedContact =
    !isEditingMyProfile &&
    (props?.selectedAddedContact || props.route?.params?.selectedAddedContact);
  const myContact = globalContactsInformation.myProfile;
  const isFirstTimeEditing = myContact?.didEditProfile;

  console.log(
    fromSettings,
    "tesing",
    t("contacts.editMyProfilePage.navTitle"),
    props
  );

  const selectedAddedContact = props.fromInitialAdd
    ? providedContact
    : decodedAddedContacts.find(
        (contact) => contact.uuid === providedContact?.uuid
      );
  console.log(props.fromInitialAdd, selectedAddedContact, providedContact);

  useEffect(() => {
    if (!props.confirmed) return;
    deleteContact(selectedAddedContact);
    navigate("/contacts");
  }, [props]);

  if (hideProfileImage) {
    return (
      <InnerContent
        isEditingMyProfile={isEditingMyProfile}
        selectedAddedContact={selectedAddedContact}
        fromInitialAdd={props.fromInitialAdd}
        fromSettings={fromSettings}
        hideProfileImage={true}
      />
    );
  }

  return (
    <SafeAreaComponent
      customStyles={{
        padding: fromSettings ? "20px 0" : 0,
        width: fromSettings ? "95%" : "100%",
      }}
    >
      <div id="editMyProfile">
        <CustomSettingsNavbar
          shouldDismissKeyboard={true}
          text={fromSettings ? t("contacts.editMyProfilePage.navTitle") : ""}
          customBackFunction={() => {
            if (!isFirstTimeEditing) {
              toggleGlobalContactsInformation(
                {
                  myProfile: {
                    ...globalContactsInformation.myProfile,
                    didEditProfile: true,
                  },
                  addedContacts: globalContactsInformation.addedContacts,
                },
                true
              );
            }
            navigate(-1);
          }}
          LeftImageIcon={Trash}
          leftImageFunction={() =>
            openOverlay({
              for: "confirm-action",
              confirmHeader: t("contacts.editMyProfilePage.deleateWarning"),
              fromRoute: "edit-profile",
              useProps: true,
              useCustomProps: true,
              customProps: { ...props, confirmed: true },
            })
          }
          leftImageStyles={{ height: 25, width: "unset", aspectRatio: 1 }}
          showLeftImage={!isEditingMyProfile}
        />
        <InnerContent
          isEditingMyProfile={isEditingMyProfile}
          selectedAddedContact={selectedAddedContact}
          fromInitialAdd={props.fromInitialAdd}
          fromSettings={fromSettings}
          openOverlay={openOverlay}
        />
      </div>
    </SafeAreaComponent>
  );
}

function ProfileInputFields({
  inputs,
  changeInputText,
  setIsKeyboardActive,
  nameRef,
  uniquenameRef,
  bioRef,
  receiveAddressRef,
  isEditingMyProfile,
  selectedAddedContact,
  myContact,
  theme,
  darkModeType,
  textInputColor,
  textInputBackground,
  textColor,
  navigate,
  t,
}) {
  const { openOverlay } = useOverlay();
  return (
    <>
      <EditProfileTextInput
        label={t("contacts.editMyProfilePage.nameInputDesc")}
        placeholder={t("contacts.editMyProfilePage.nameInputPlaceholder")}
        value={inputs?.name}
        onChangeText={(text) => changeInputText(text, "name")}
        onFocus={() => setIsKeyboardActive(true)}
        onBlur={() => setIsKeyboardActive(false)}
        inputRef={nameRef}
        maxLength={30}
        theme={theme}
        darkModeType={darkModeType}
        textInputColor={textInputColor}
        textInputBackground={textInputBackground}
        textColor={textColor}
      />

      {selectedAddedContact?.isLNURL && (
        <EditProfileTextInput
          label={t("contacts.editMyProfilePage.lnurlInputDesc")}
          placeholder={t("contacts.editMyProfilePage.lnurlInputPlaceholder")}
          value={inputs?.receiveAddress}
          onChangeText={(text) => changeInputText(text, "receiveAddress")}
          onFocus={() => setIsKeyboardActive(true)}
          onBlur={() => setIsKeyboardActive(false)}
          inputRef={receiveAddressRef}
          maxLength={200}
          multiline={false}
          minHeight={60}
          theme={theme}
          darkModeType={darkModeType}
          textInputColor={textInputColor}
          textInputBackground={textInputBackground}
          textColor={textColor}
        />
      )}

      {isEditingMyProfile && (
        <EditProfileTextInput
          label={t("contacts.editMyProfilePage.uniqueNameInputDesc")}
          placeholder={myContact?.uniqueName}
          value={inputs.uniquename}
          onChangeText={(text) => changeInputText(text, "uniquename")}
          onFocus={() => setIsKeyboardActive(true)}
          onBlur={() => setIsKeyboardActive(false)}
          inputRef={uniquenameRef}
          maxLength={30}
          theme={theme}
          darkModeType={darkModeType}
          textInputColor={textInputColor}
          textInputBackground={textInputBackground}
          textColor={textColor}
          showInfoIcon={true}
          onInfoPress={() =>
            openOverlay({
              for: "informationPopup",
              textContent: t(
                "wallet.receivePages.editLNURLContact.informationMessage"
              ),
              buttonText: t("constants.understandText"),
            })
          }
        />
      )}

      <EditProfileTextInput
        label={t("contacts.editMyProfilePage.bioInputDesc")}
        placeholder={t("contacts.editMyProfilePage.bioInputPlaceholder")}
        value={inputs?.bio}
        onChangeText={(text) => changeInputText(text, "bio")}
        onFocus={() => setIsKeyboardActive(true)}
        onBlur={() => setIsKeyboardActive(false)}
        inputRef={bioRef}
        maxLength={150}
        multiline={true}
        minHeight={60}
        maxHeight={100}
        theme={theme}
        darkModeType={darkModeType}
        textInputColor={textInputColor}
        textInputBackground={textInputBackground}
        textColor={textColor}
        containerStyle={{ marginBottom: 10 }}
      />
    </>
  );
}

function InnerContent({
  isEditingMyProfile,
  selectedAddedContact = {},
  fromInitialAdd,
  fromSettings,
  openOverlay,
  hideProfileImage,
}) {
  const navigate = useNavigate();
  const { contactsPrivateKey, publicKey } = useKeysContext();
  const { theme, darkModeType } = useThemeContext();
  const { cache, refreshCacheObject } = useImageCache();
  const { backgroundOffset, textInputColor, textInputBackground, textColor } =
    useThemeColors();
  const {
    decodedAddedContacts,
    globalContactsInformation,
    toggleGlobalContactsInformation,
  } = useGlobalContacts();
  const { t } = useTranslation();
  const {
    isAddingImage,
    deleteProfilePicture,
    getProfileImage,
    saveProfileImage,
  } = useProfileImage();

  const nameRef = useRef(null);
  const uniquenameRef = useRef(null);
  const bioRef = useRef(null);
  const receiveAddressRef = useRef(null);
  const didCallImagePicker = useRef(null);
  const myContact = globalContactsInformation.myProfile;

  const myContactName = myContact?.name || "";
  const myContactBio = myContact?.bio || "";
  const myContactUniqueName = myContact?.uniqueName || "";
  const isFirstTimeEditing = myContact?.didEditProfile;

  const selectedAddedContactName = selectedAddedContact?.name || "";
  const selectedAddedContactBio = selectedAddedContact?.bio || "";
  const selectedAddedContactUniqueName = selectedAddedContact?.uniqueName || "";
  const selectedAddedContactReceiveAddress =
    selectedAddedContact?.receiveAddress || "";

  const [isSaving, setIsSaving] = useState(false);
  const [inputs, setInputs] = useState(() => ({
    name: isFirstTimeEditing
      ? isEditingMyProfile
        ? myContactName || ""
        : selectedAddedContactName || ""
      : "",
    bio: isFirstTimeEditing
      ? isEditingMyProfile
        ? myContactBio || ""
        : selectedAddedContactBio || ""
      : "",
    uniquename: isFirstTimeEditing
      ? isEditingMyProfile
        ? myContactUniqueName || ""
        : selectedAddedContactUniqueName || ""
      : "",
    receiveAddress: selectedAddedContactReceiveAddress || "",
  }));

  const [tempImage, setTempImage] = useState({
    uri: null,
    comparison: null,
    updated: 0,
    shouldDelete: false,
  });

  function changeInputText(text, type) {
    setInputs((prev) => {
      return { ...prev, [type]: text };
    });
  }

  const myProfileImage = cache[myContact?.uuid];
  const selectedAddedContactImage = cache[selectedAddedContact?.uuid];
  const hasImage = tempImage.shouldDelete
    ? false
    : tempImage.uri
    ? true
    : isEditingMyProfile
    ? !!myProfileImage?.localUri
    : !!selectedAddedContactImage?.localUri;

  const hasChangedInfo = isEditingMyProfile
    ? myContactName !== inputs.name ||
      myContactBio !== inputs.bio ||
      myContactUniqueName !== inputs.uniquename ||
      tempImage.uri ||
      tempImage.shouldDelete
    : selectedAddedContactName !== inputs.name ||
      selectedAddedContactBio !== inputs.bio ||
      selectedAddedContactUniqueName !== inputs.uniquename ||
      selectedAddedContactReceiveAddress !== inputs.receiveAddress ||
      fromInitialAdd ||
      tempImage.uri ||
      tempImage.shouldDelete;

  const handleDeleteProfilePicture = () => {
    setTempImage({
      uri: null,
      comparison: null,
      updated: 0,
      shouldDelete: true,
    });
  };

  const addProfilePicture = async () => {
    if (didCallImagePicker.current) return;
    didCallImagePicker.current = true;
    const response = await getProfileImage();
    if (response?.imgURL && response?.comparison) {
      setTempImage({
        comparison: response?.comparison,
        uri: response?.imgURL,
        updated: Date.now(),
      });
    }
    didCallImagePicker.current = false;
  };

  useEffect(() => {
    if (!fromInitialAdd) return;
    if (hasImage) return;
    // Making sure to update UI for new contacts image
    refreshCacheObject();
  }, []);

  const inputFieldsProps = {
    inputs,
    changeInputText,
    nameRef,
    uniquenameRef,
    bioRef,
    receiveAddressRef,
    isEditingMyProfile,
    selectedAddedContact,
    myContact,
    theme,
    darkModeType,
    textInputColor,
    textInputBackground,
    textColor,
    navigate,
    t,
  };

  if (hideProfileImage) {
    return (
      <>
        <div>
          <ProfileInputFields {...inputFieldsProps} />
        </div>
        <CustomButton
          buttonStyles={{
            width: "auto",
            marginTop: 10,
          }}
          useLoading={isSaving}
          actionFunction={saveChanges}
          textContent={
            hasChangedInfo
              ? fromInitialAdd
                ? t("contacts.editMyProfilePage.addContactBTN")
                : t("constants.save")
              : t("constants.back")
          }
        />
      </>
    );
  }

  return (
    <div
      className="editProfileInnerContainer"
      style={{
        width: fromSettings ? "90%" : "100%",
        marginTop: fromSettings ? "0" : "15px",
      }}
    >
      <div
        style={{ paddingTop: fromSettings ? 30 : 0 }}
        className="editProfileScrollContainer"
      >
        <div
          className="profileImageContainer"
          onClick={() => {
            if (!isEditingMyProfile && !selectedAddedContact.isLNURL) return;
            if (isAddingImage) return;
            if (!hasImage) {
              addProfilePicture(isEditingMyProfile, selectedAddedContact);
              return;
            } else {
              handleDeleteProfilePicture();
            }
          }}
        >
          <div
            className="profileImageBackground"
            style={{ backgroundColor: backgroundOffset }}
          >
            {isAddingImage ? (
              <FullLoadingScreen />
            ) : (
              <ContactProfileImage
                updated={
                  tempImage.shouldDelete
                    ? null
                    : tempImage.uri
                    ? tempImage.comparison?.updated
                    : isEditingMyProfile
                    ? myProfileImage?.updated
                    : selectedAddedContactImage?.updated
                }
                uri={
                  tempImage.shouldDelete
                    ? null
                    : tempImage.uri
                    ? tempImage.comparison?.uri
                    : isEditingMyProfile
                    ? myProfileImage?.localUri
                    : selectedAddedContactImage?.localUri
                }
                darkModeType={darkModeType}
                theme={theme}
              />
            )}
          </div>
          {(isEditingMyProfile || selectedAddedContact.isLNURL) && (
            <div
              className="selectFromPhotoesImage"
              style={{ backgroundColor: Colors.dark.text }}
            >
              {hasImage ? <X size={17} /> : <Image size={17} />}
            </div>
          )}
        </div>

        <ProfileInputFields {...inputFieldsProps} />
      </div>

      <CustomButton
        buttonStyles={{
          width: "auto",
          margin: "10px auto 0",
        }}
        actionFunction={saveChanges}
        textContent={
          hasChangedInfo
            ? fromInitialAdd
              ? t("contacts.editMyProfilePage.addContactBTN")
              : t("constants.save")
            : t("constants.back")
        }
      />
    </div>
  );
  async function saveChanges() {
    try {
      if (
        inputs.name.length >= 30 ||
        inputs.bio.length >= 150 ||
        inputs.uniquename.length >= 30 ||
        (selectedAddedContact?.isLNURL &&
          inputs.receiveAddress.length >= 200) ||
        isAddingImage
      )
        return;
      setIsSaving(true);

      console.log(tempImage, selectedAddedContact, isEditingMyProfile);

      if (tempImage.shouldDelete) {
        await deleteProfilePicture(isEditingMyProfile, selectedAddedContact);
      } else if (tempImage.uri && tempImage.comparison) {
        const areImagesTheSame = await areImagesSame(
          tempImage.imgURL?.uri,
          isEditingMyProfile
            ? myProfileImage?.localUri
            : selectedAddedContactImage?.localUri
        );

        if (!areImagesTheSame) {
          await saveProfileImage(
            tempImage,
            isEditingMyProfile,
            selectedAddedContact
          );
        }
      }

      const uniqueName =
        isEditingMyProfile && !isFirstTimeEditing
          ? inputs.uniquename || myContact.uniqueName
          : inputs.uniquename;

      if (isEditingMyProfile) {
        if (
          myContact?.bio === inputs.bio &&
          myContact?.name === inputs.name &&
          myContact?.uniqueName === inputs.uniquename &&
          isFirstTimeEditing
        ) {
          navigate(-1);
        } else {
          console.log(uniqueName, "testing");
          if (!VALID_USERNAME_REGEX.test(uniqueName)) {
            openOverlay({
              for: "error",
              errorMessage: t(
                "contacts.editMyProfilePage.unqiueNameRegexError"
              ),
            });
            return;
          }

          if (myContact?.uniqueName != uniqueName) {
            const isFreeUniqueName = await isValidUniqueName(
              "blitzWalletUsers",
              inputs.uniquename.trim()
            );
            if (!isFreeUniqueName) {
              openOverlay({
                for: "error",
                errorMessage: t(
                  "contacts.editMyProfilePage.usernameAlreadyExistsError"
                ),
              });
              return;
            }
          }
          toggleGlobalContactsInformation(
            {
              myProfile: {
                ...globalContactsInformation.myProfile,
                name: inputs.name.trim(),
                nameLower: inputs.name.trim().toLowerCase(),
                bio: inputs.bio,
                uniqueName: uniqueName.trim(),
                uniqueNameLower: uniqueName.trim().toLowerCase(),
                didEditProfile: true,
              },
              addedContacts: globalContactsInformation.addedContacts,
            },
            true
          );
          navigate(-1);
        }
      } else {
        if (fromInitialAdd) {
          let tempContact = JSON.parse(JSON.stringify(selectedAddedContact));
          tempContact.name = inputs.name.trim();
          tempContact.nameLower = inputs.name.trim().toLowerCase();
          tempContact.bio = inputs.bio;
          tempContact.isAdded = true;
          tempContact.unlookedTransactions = 0;
          if (selectedAddedContact.isLNURL) {
            tempContact.receiveAddress = inputs.receiveAddress;
          }

          let newAddedContacts = JSON.parse(
            JSON.stringify(decodedAddedContacts)
          );
          const isContactInAddedContacts = newAddedContacts.filter(
            (addedContact) => addedContact.uuid === tempContact.uuid
          ).length;

          if (isContactInAddedContacts) {
            newAddedContacts = newAddedContacts.map((addedContact) => {
              if (addedContact.uuid === tempContact.uuid) {
                return {
                  ...addedContact,
                  name: tempContact.name,
                  nameLower: tempContact.nameLower,
                  bio: tempContact.bio,
                  unlookedTransactions: 0,
                  isAdded: true,
                };
              } else return addedContact;
            });
          } else newAddedContacts.push(tempContact);

          toggleGlobalContactsInformation(
            {
              myProfile: {
                ...globalContactsInformation.myProfile,
              },
              addedContacts: await encryptMessage(
                contactsPrivateKey,
                publicKey,
                JSON.stringify(newAddedContacts)
              ),
              // unaddedContacts:
              //   globalContactsInformation.unaddedContacts,
            },
            true
          );

          return;
        }
        if (
          selectedAddedContact?.bio === inputs.bio &&
          selectedAddedContact?.name === inputs.name &&
          selectedAddedContact?.receiveAddress === inputs.receiveAddress
        )
          navigate(-1);
        else {
          let newAddedContacts = [...decodedAddedContacts];
          console.log(selectedAddedContact);
          const indexOfContact = decodedAddedContacts.findIndex(
            (obj) => obj.uuid === selectedAddedContact.uuid
          );
          console.log(indexOfContact);
          console.log("testing");

          let contact = newAddedContacts[indexOfContact];
          console.log(contact);

          contact["name"] = inputs.name.trim();
          contact["nameLower"] = inputs.name.trim().toLowerCase();
          contact["bio"] = inputs.bio.trim();

          console.log(contact);

          if (
            selectedAddedContact.isLNURL &&
            selectedAddedContact?.receiveAddress !== inputs.receiveAddress
          ) {
            contact["receiveAddress"] = inputs.receiveAddress.trim();
          }

          toggleGlobalContactsInformation(
            {
              myProfile: {
                ...globalContactsInformation.myProfile,
              },
              addedContacts: await encryptMessage(
                contactsPrivateKey,
                publicKey,
                JSON.stringify(newAddedContacts)
              ),
            },
            true
          );
          navigate(-1);
        }
      }
    } catch (err) {
      console.log("Error saving changes", err);
    } finally {
      setIsSaving(false);
    }
  }
}
