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
import {
  deleteDatabaseImage,
  setDatabaseIMG,
} from "../../../../../db/photoStorage";
import "./style.css";
import ContactProfileImage from "../../components/profileImage/profileImage";
import { Colors } from "../../../../constants/theme";
import imagesIcon from "../../../../assets/imagesDark.png";
import xSmallIconBlack from "../../../../assets/x-small-black.webp";
import CustomInput from "../../../../components/customInput/customInput";
import { VALID_USERNAME_REGEX } from "../../../../constants";

export default function EditMyProfilePage() {
  const navigate = useNavigate();
  const {
    decodedAddedContacts,
    toggleGlobalContactsInformation,
    globalContactsInformation,
  } = useGlobalContacts();

  const location = useLocation();
  const props = location.state;
  const pageType = props?.pageType || props.route?.params?.pageType;
  const fromSettings = props.fromSettings || props.route?.params?.fromSettings;

  const isEditingMyProfile = pageType.toLowerCase() === "myprofile";
  const providedContact =
    !isEditingMyProfile &&
    (props?.selectedAddedContact || props.route?.params?.selectedAddedContact);
  const myContact = globalContactsInformation.myProfile;
  const isFirstTimeEditing = myContact?.didEditProfile;

  const selectedAddedContact = props.fromInitialAdd
    ? providedContact
    : decodedAddedContacts.find(
        (contact) => contact.uuid === providedContact?.uuid
      );

  return (
    <div id="editMyProfile">
      <div className="pageNavBar">
        <BackArrow
          backFunction={() => {
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
        />
        <p>{fromSettings ? "Edit Profile" : ""}</p>
      </div>
      <InnerContent
        isEditingMyProfile={isEditingMyProfile}
        selectedAddedContact={selectedAddedContact}
        fromInitialAdd={props.fromInitialAdd}
        fromSettings={fromSettings}
      />
    </div>
  );
}

function InnerContent({
  isEditingMyProfile,
  selectedAddedContact,
  fromInitialAdd,
  fromSettings,
}) {
  const location = useLocation();
  const { contactsPrivateKey, publicKey } = useKeysContext();
  //   const { theme, darkModeType } = useGlobalThemeContext();
  const { cache, refreshCache, removeProfileImageFromCache } = useImageCache();
  //   const { backgroundOffset, textInputColor, textInputBackground, textColor } =
  //     GetThemeColors();
  const {
    decodedAddedContacts,
    globalContactsInformation,
    toggleGlobalContactsInformation,
  } = useGlobalContacts();
  const { t } = useTranslation();
  const [isAddingImage, setIsAddingImage] = useState(false);

  const nameRef = useRef(null);
  const uniquenameRef = useRef(null);
  const bioRef = useRef(null);
  const receiveAddressRef = useRef(null);
  const myContact = globalContactsInformation.myProfile;

  const myContactName = myContact?.name;
  const myContactBio = myContact?.bio;
  const myContactUniqueName = myContact?.uniqueName;
  const isFirstTimeEditing = myContact?.didEditProfile;

  const selectedAddedContactName = selectedAddedContact?.name;
  const selectedAddedContactBio = selectedAddedContact?.bio;
  const selectedAddedContactUniqueName = selectedAddedContact?.uniqueName;
  const selectedAddedContactReceiveAddress =
    selectedAddedContact?.receiveAddress;

  const [inputs, setInputs] = useState({
    name: "",
    bio: "",
    uniquename: "",
    receiveAddress: "",
  });

  const navigate = useNavigate();

  function changeInputText(text, type) {
    setInputs((prev) => {
      return { ...prev, [type]: text };
    });
  }

  useEffect(() => {
    changeInputText(
      isFirstTimeEditing
        ? isEditingMyProfile
          ? myContactName || ""
          : selectedAddedContactName || ""
        : "",
      "name"
    );
    changeInputText(
      isFirstTimeEditing
        ? isEditingMyProfile
          ? myContactBio || ""
          : selectedAddedContactBio || ""
        : "",
      "bio"
    );
    changeInputText(
      isFirstTimeEditing
        ? isEditingMyProfile
          ? myContactUniqueName || ""
          : selectedAddedContactUniqueName || ""
        : "",
      "uniquename"
    );
    changeInputText(selectedAddedContactReceiveAddress || "", "receiveAddress");
  }, [
    isEditingMyProfile,
    myContactName,
    myContactBio,
    myContactUniqueName,
    selectedAddedContactName,
    selectedAddedContactBio,
    selectedAddedContactUniqueName,
  ]);

  const myProfileImage = cache[myContact?.uuid];
  const selectedAddedContactImage = cache[selectedAddedContact?.uuid];
  const hasImage = isEditingMyProfile
    ? !!myProfileImage?.localUri
    : !!selectedAddedContactImage?.localUri;

  return (
    <div className="editProfileInnerContainer">
      <div className="editProfileScrollContainer">
        <div
          className="profileImageContainer"
          onClick={() => {
            navigate("/error", {
              state: {
                errorMessage: "Feature coming soon...",
                background: location,
              },
            });
            return;
            if (!isEditingMyProfile && !selectedAddedContact.isLNURL) return;
            if (isAddingImage) return;
            if (!hasImage) {
              addProfilePicture();
              return;
            }
            navigate("AddOrDeleteContactImage", {
              addPhoto: addProfilePicture,
              deletePhoto: deleteProfilePicture,
              hasImage: hasImage,
            });
          }}
        >
          <div
            className="profileImageBackground"
            style={{ backgroundColor: Colors.light.backgroundOffset }}
          >
            {isAddingImage ? (
              <FullLoadingScreen />
            ) : (
              <ContactProfileImage
                updated={
                  isEditingMyProfile
                    ? myProfileImage?.updated
                    : selectedAddedContactImage?.updated
                }
                uri={
                  isEditingMyProfile
                    ? myProfileImage?.localUri
                    : selectedAddedContactImage?.localUri
                }
                // darkModeType={darkModeType}
                // theme={theme}
              />
            )}
          </div>
          {(isEditingMyProfile || selectedAddedContact.isLNURL) && (
            <div
              className="selectFromPhotoesImage"
              style={{ backgroundColor: Colors.dark.text }}
            >
              <img
                src={hasImage ? xSmallIconBlack : imagesIcon}
                alt=""
                srcset=""
              />
            </div>
          )}
        </div>

        <div
          className="textInputContainer"
          onPress={() => {
            nameRef.current.focus();
          }}
        >
          <ThemeText textContent={"Name"} />
          <CustomInput
            containerClassName={"editPageContainer"}
            onchange={(data) => {
              changeInputText(data, "name");
            }}
            value={inputs.name || ""}
            placeholder={"Name..."}
            customInputStyles={{
              color:
                inputs.name.length < 30
                  ? Colors.light.text
                  : Colors.constants.cancelRed,
            }}
          />
          <ThemeText
            textStyles={{
              textAlign: "right",
              color:
                inputs.name.length < 30
                  ? Colors.light.text
                  : Colors.constants.cancelRed,
              marginTop: 20,
              marginBottom: 0,
            }}
            textContent={`${inputs.name.length} / ${30}`}
          />
        </div>
        {selectedAddedContact?.isLNURL && (
          <div
            className="textInputContianer"
            onPress={() => {
              receiveAddressRef.current.focus();
            }}
          >
            <ThemeText textContent={"Lnurl"} />
            <CustomInput
              containerClassName={"editPageContainer"}
              onchange={(data) => {
                changeInputText(data, "receiveAddress");
              }}
              value={inputs.receiveAddress || ""}
              placeholder={"LNURL..."}
              customInputStyles={{
                color:
                  inputs.receiveAddress.length < 60
                    ? Colors.light.text
                    : Colors.constants.cancelRed,
              }}
            />
            <ThemeText
              styles={{
                textAlign: "right",
                color:
                  inputs.receiveAddress.length < 60
                    ? Colors.light.text
                    : Colors.constants.cancelRed,
                marginTop: 20,
                marginBottom: 0,
              }}
              content={`${inputs.receiveAddress.length} / ${60}`}
            />
          </div>
        )}
        {isEditingMyProfile && (
          <div
            className="textInputContainer"
            // style={styles.textInputContainer}
            // activeOpacity={1}
            onPress={() => {
              uniquenameRef.current.focus();
            }}
          >
            <ThemeText textContent={"Username"} />
            <CustomInput
              containerClassName={"editPageContainer"}
              onchange={(data) => {
                changeInputText(data, "uniquename");
              }}
              value={inputs.uniquename || ""}
              placeholder={myContact.uniqueName}
              customInputStyles={{
                color:
                  inputs.uniquename.length < 30
                    ? Colors.light.text
                    : Colors.constants.cancelRed,
              }}
            />
            <ThemeText
              textStyles={{
                textAlign: "right",
                color:
                  inputs.uniquename.length < 30
                    ? Colors.light.text
                    : Colors.constants.cancelRed,
                marginTop: 20,
                marginBottom: 0,
              }}
              textContent={`${inputs.uniquename.length} / ${30}`}
            />
          </div>
        )}
        <div
          className="textInputContainer"
          onPress={() => {
            bioRef.current.focus();
          }}
        >
          <ThemeText textContent={"Bio"} />
          <CustomInput
            containerClassName={"editPageContainer"}
            onchange={(data) => {
              changeInputText(data, "bio");
            }}
            value={inputs.bio || ""}
            placeholder={"Bio..."}
            customInputStyles={{
              color:
                inputs.bio.length < 150
                  ? Colors.light.text
                  : Colors.constants.cancelRed,
              maxHeight: "100px",
            }}
            multiline={true}
          />

          <ThemeText
            textStyles={{
              textAlign: "right",
              color:
                inputs.bio.length < 150
                  ? Colors.light.text
                  : Colors.constants.cancelRed,
            }}
            textContent={`${inputs.bio.length} / ${150}`}
          />
        </div>
      </div>

      <CustomButton
        buttonStyles={{
          width: "auto",
          margin: "10px auto 0",
        }}
        actionFunction={saveChanges}
        textContent={fromInitialAdd ? "Save" : "Save"}
      />
    </div>
  );
  async function saveChanges() {
    if (
      inputs.name.length > 30 ||
      inputs.bio.length > 150 ||
      inputs.uniquename.length > 30 ||
      (selectedAddedContact?.isLNURL && inputs.receiveAddress.length > 100)
    )
      return;

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
          navigate("/error", {
            state: {
              errorMessage:
                "You can only have letters, numbers, or underscores in your username, and must contain at least 1 letter.",
              background: location,
            },
          });
          return;
        }

        if (myContact?.uniqueName != uniqueName) {
          const isFreeUniqueName = await isValidUniqueName(
            "blitzWalletUsers",
            inputs.uniquename.trim()
          );
          if (!isFreeUniqueName) {
            navigate("/error", {
              state: {
                errorMessage: "Username already taken, try again!",
                background: location,
              },
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
            // unaddedContacts:
            //   globalContactsInformation.unaddedContacts,
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
        if (selectedAddedContact.isLNURL) {
          tempContact.receiveAddress = inputs.receiveAddress;
        }

        let newAddedContacts = JSON.parse(JSON.stringify(decodedAddedContacts));
        const isContactInAddedContacts = newAddedContacts.filter(
          (addedContact) => addedContact.uuid === tempContact.uuid
        ).length;

        if (isContactInAddedContacts) {
          newAddedContacts = newAddedContacts.map((addedContact) => {
            if (addedContact.uuid === tempContact.uuid) {
              return {
                ...addedContact,
                name: inputs.name,
                nameLower: inputs.name.toLowerCase(),
                bio: inputs.bio,
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
            addedContacts: encryptMessage(
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
        navigate.goBack();
      else {
        let newAddedContacts = [...decodedAddedContacts];
        const indexOfContact = decodedAddedContacts.findIndex(
          (obj) => obj.uuid === selectedAddedContact.uuid
        );

        let contact = newAddedContacts[indexOfContact];

        contact["name"] = inputs.name.trim();
        contact["nameLower"] = inputs.name.trim().toLowerCase();
        contact["bio"] = inputs.bio.trim();
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
            addedContacts: encryptMessage(
              contactsPrivateKey,
              publicKey,
              JSON.stringify(newAddedContacts)
            ),
            // unaddedContacts:
            //   globalContactsInformation.unaddedContacts,
          },
          true
        );
        navigate.goBack();
      }
    }
  }

  async function addProfilePicture() {
    // const imagePickerResponse = await getImageFromLibrary({ quality: 1 });
    // const { didRun, error, imgURL } = imagePickerResponse;
    // if (!didRun) return;
    // if (error) {
    //   navigate("/error", {
    //     state: {
    //       errorMessage: error,
    //       background: location,
    //     },
    //   });
    //   return;
    // }
    // if (isEditingMyProfile) {
    //   const response = await uploadProfileImage({ imgURL: imgURL });
    //   if (!response) return;
    //   toggleGlobalContactsInformation(
    //     {
    //       myProfile: {
    //         ...globalContactsInformation.myProfile,
    //         hasProfileImage: true,
    //       },
    //       addedContacts: globalContactsInformation.addedContacts,
    //     },
    //     true
    //   );
    //   return;
    // }
    // await refreshCache(selectedAddedContact.uuid, imgURL.uri);
  }
  async function uploadProfileImage({ imgURL, removeImage }) {
    // try {
    //   setIsAddingImage(true);
    //   if (!removeImage) {
    //     const resized = ImageManipulator.ImageManipulator.manipulate(
    //       imgURL.uri
    //     ).resize({ width: 350 });
    //     const image = await resized.renderAsync();
    //     const savedImage = await image.saveAsync({
    //       compress: 0.4,
    //       format: ImageManipulator.SaveFormat.WEBP,
    //     });
    //     const response = await setDatabaseIMG(
    //       globalContactsInformation.myProfile.uuid,
    //       { uri: savedImage.uri }
    //     );
    //     if (response) {
    //       await refreshCache(
    //         globalContactsInformation.myProfile.uuid,
    //         response
    //       );
    //       return true;
    //     } else throw new Error("Unable to save image");
    //   } else {
    //     await deleteDatabaseImage(globalContactsInformation.myProfile.uuid);
    //     await removeProfileImageFromCache(
    //       globalContactsInformation.myProfile.uuid
    //     );
    //     return true;
    //   }
    // } catch (err) {
    //   console.log(err);
    //   navigate("/error", {
    //     state: {
    //       errorMessage: err.message,
    //       background: location,
    //     },
    //   });
    //   return false;
    // } finally {
    //   setIsAddingImage(false);
    // }
  }
  async function deleteProfilePicture() {
    //   try {
    //     if (isEditingMyProfile) {
    //       const response = await uploadProfileImage({ removeImage: true });
    //       console.log(response);
    //       if (!response) return;
    //       toggleGlobalContactsInformation(
    //         {
    //           myProfile: {
    //             ...globalContactsInformation.myProfile,
    //             hasProfileImage: false,
    //           },
    //           addedContacts: globalContactsInformation.addedContacts,
    //         },
    //         true
    //       );
    //       return;
    //     }
    //     await removeProfileImageFromCache(selectedAddedContact.uuid);
    //   } catch (err) {
    //     navigate("/error", {
    //       state: {
    //         errorMessage: "Unable to deleate image.",
    //         background: location,
    //       },
    //     });
    //     console.log(err);
    //   }
  }
}
