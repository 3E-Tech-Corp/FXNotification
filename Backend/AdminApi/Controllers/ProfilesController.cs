using AdminApi.Models;
using AdminApi.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace AdminApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProfilesController : ControllerBase
{
    private readonly IProfileRepository _repository;
    private readonly ILogger<ProfilesController> _logger;

    public ProfilesController(IProfileRepository repository, ILogger<ProfilesController> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Profile>>> GetAll()
    {
        try
        {
            var profiles = await _repository.GetAllAsync();
            return Ok(profiles);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting profiles");
            return StatusCode(500, "An error occurred while retrieving profiles");
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Profile>> GetById(int id)
    {
        try
        {
            var profile = await _repository.GetByIdAsync(id);
            if (profile == null)
                return NotFound();
            return Ok(profile);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting profile {Id}", id);
            return StatusCode(500, "An error occurred while retrieving the profile");
        }
    }

    [HttpPost]
    public async Task<ActionResult<Profile>> Create([FromBody] ProfileCreateDto dto)
    {
        try
        {
            var id = await _repository.CreateAsync(dto);
            var profile = await _repository.GetByIdAsync(id);
            return CreatedAtAction(nameof(GetById), new { id }, profile);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating profile");
            return StatusCode(500, "An error occurred while creating the profile");
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] ProfileUpdateDto dto)
    {
        try
        {
            if (id != dto.ProfileId)
                return BadRequest("ID mismatch");

            await _repository.UpdateAsync(dto);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating profile {Id}", id);
            return StatusCode(500, "An error occurred while updating the profile");
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _repository.DeleteAsync(id);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting profile {Id}", id);
            return StatusCode(500, "An error occurred while deleting the profile");
        }
    }
}
