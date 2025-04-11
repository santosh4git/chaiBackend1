//using promisses
const asyncHandler = (requesrHandler) => {
    (req,res,next) =>{
        Promise.resolve(requesrHandler(req,res,next)).catch((err) =>next(err))
    }
}

export {asyncHandler}


// const asyncHandler = () => {}
// const asyncHandler = (func) => () => {}
// const asyncHandler = (func) => async () => {}

/*
const asyncHandler = (fn) => async (req,res,next) => {
    try{
        await fn(req,res,next)
    }catch(error){
        res.status(error.code || 500).json({
            success: false,
            message: error.message
        })
    }
}

*/