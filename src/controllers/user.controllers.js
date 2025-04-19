import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import path from "path";

const generateAccessAndRefreshTokens = async(userId) =>{
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:  false})

        return {accessToken, refreshToken}

    }catch(error){
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}


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

    const {fullName, email, username, password} = req.body
    console.log("fullName: ",fullName);
    console.log("email: ",email);
    console.log("username:" ,username);
    console.log("password:",password);

    if(
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400,"All fields are required")
    }
    const existedUser = await User.findOne({
        $or:    [{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"User with email or username already exists")
    }
    //test
    console.log("Files received:", req.files);

    const avtarLocalPath = path.resolve(req.files?.avtar[0]?.path)
    const coverImageLocalPath = path.resolve(req.files?.coverImage[0]?.path)

    if(!avtarLocalPath){
        throw new ApiError(400,"Avtar file is required")
    }

    const avtar = await uploadOnCloudinary(avtarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avtar){
        throw new ApiError(400,"Avtar file is required")
    }

     const user = await User.create({
        fullName,
        avtar:  avtar.url,
        coverImage: coverImage?.url || "",
        email,
        username:   username.toLowerCase(),
        password
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

const loginUser = asyncHandler(async(req,res) => {
    // req body -> data
    // username or email
    // find user
    // password check
    // access and referesh token
    // send cookie
    
    const {email,username,password} = req.body

    if(!(username || email)){
        throw new ApiError(400,"username or password is required")
    }

    const user = await User.findOne({
        $or:    [{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"invalid user credentials")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refershToken")

    const option = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,option)
    .cookie("refreshToken",refreshToken,option)
    .json(
        new ApiResponse(
            200,
            {
                user:   loggedInUser,accessToken,refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req,res) => {
    await User.findByIdAndUpdate(
       req.user._id,{
            $set:{
                refreshToken:   undefined
            }
       },
       {
        new:    true
       }
    )

    const option = {
        httpOnly:   true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new ApiResponse(200,{},"User logged Out"))
})

const refreshAccessToken = asyncHandler(async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

    try{
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"invalid refresh token")
        } 
        
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"refresh token is expired or used")
        }
    
        const option = {
            httpOnly:   true,
            secure: true
        }
    
        const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,option)
        .cookie("refreshToken",newRefreshToken,option)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    }catch(error){
        throw new ApiError(401, error?.message || "Invalid referesh token")
    }
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}