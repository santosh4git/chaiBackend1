import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async(req,res) => {
    //  get user details from frontend
    //  validation - not empty
    //  check if user already exits:    username,email
    //  check for image, check for avtar
    //  upload them to cloudinary, avtar
    //  create user object - create entry in db
    //  remove password and refresh token field from response
    //  check for user creation
    //  return res

    const {fullname, email, username, password} = req.body
    console.log("email: ",email);

    if(
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400,"All fields are required")
    }
    const existedUser = User.findOne({
        $or:    [{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"User with email or username already exists")
    }
    const avtarLocalPath = req.files?.avtar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if(!avtarLocalPath){
        throw new ApiError(400,"Avtar file is required")
    }

    const avtar = await uploadOnCloudinary(avtarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avtar){
        throw new ApiError(400,"Avtar file is required")
    }

     const user = await User.create({
        fullname,
        avtar:  avtar.url,
        coverImage: coverImage?.url || "",
        email,
        username:   username.toLowercase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while regestering user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )
})


export {
    registerUser,
}