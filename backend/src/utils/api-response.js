const successResponse = (
    message = "Success",
    data = null
) => ({
    success: true,
    message,
    data
});

const errorResponse = (
    message = "Something went wrong",
    error = null
) => ({
    success: false,
    message,
    error
});

module.exports = {
    successResponse,
    errorResponse
};